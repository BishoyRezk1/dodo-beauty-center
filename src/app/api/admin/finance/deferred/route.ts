import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { entrySchema, noon } from "@/lib/finance";
import { audit, requireOwner, serializeLedger } from "@/lib/ledger";
import { monthLocked } from "@/lib/archive";
import { ensureDues } from "@/lib/dues";

export const dynamic = "force-dynamic";

const schema = entrySchema.extend({
  type: z.literal("income"),
  amount: z.coerce.number().min(0).max(10000000),
  dueAmount: z.coerce.number().positive().max(10000000),
});

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const account = await prisma.financeAccount.findFirst({ where: { code: d.method, isActive: true } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });
  if (await monthLocked(d.date.slice(0, 7))) return NextResponse.json({ error: "الشهر مقفول. افتحيه من الأرشيف الشهري أولاً" }, { status: 423 });
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  const include = { account: { select: { code: true } } };
  if (key) {
    const ex = await prisma.ledgerEntry.findUnique({ where: { idempotencyKey: key }, include });
    if (ex) return NextResponse.json(serializeLedger(ex));
  }
  const paid = Math.round(d.amount * 100) / 100;
  const due = Math.round(d.dueAmount * 100) / 100;
  try {
    await ensureDues();
    const created = await prisma.$transaction(async (tx) => {
      const e = await tx.ledgerEntry.create({
        data: {
          type: "income", category: d.category, accountId: account.id, amount: paid,
          entryDate: noon(d.date), description: d.description || null, source: "MANUAL",
          idempotencyKey: key, createdById: g.actor.id,
        },
        include,
      });
      await tx.$executeRaw`INSERT INTO "LedgerDue" ("id", "entryId", "dueAmount") VALUES (${randomUUID()}, ${e.id}, ${due}::numeric)`;
      await audit(tx, { actor: g.actor, action: "CREATE", entity: "LedgerEntry", entityId: e.id, after: { ...serializeLedger(e), dueAmount: due } });
      return e;
    });
    return NextResponse.json(serializeLedger(created));
  } catch (err) {
    console.error("deferred entry failed", err);
    return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  }
}
