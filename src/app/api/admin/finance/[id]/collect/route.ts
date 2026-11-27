import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DATE_RE, METHODS, cairoToday, noon } from "@/lib/finance";
import { audit, requireOwner } from "@/lib/ledger";
import { monthLocked } from "@/lib/archive";
import { dueOf, ensureDues } from "@/lib/dues";

export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.coerce.number().positive().max(10000000),
  method: z.enum(METHODS),
  date: z.string().regex(DATE_RE).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const date = d.date || cairoToday();
  if (await monthLocked(date.slice(0, 7))) return NextResponse.json({ error: "الشهر مقفول. افتحيه من الأرشيف الشهري أولاً" }, { status: 423 });
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  try {
    await ensureDues();
    if (key) {
      const ex = await prisma.ledgerEntry.findUnique({ where: { idempotencyKey: key } });
      if (ex) return NextResponse.json({ ok: true, duplicate: true });
    }
    const orig = await prisma.ledgerEntry.findFirst({ where: { id: params.id, status: "POSTED" } });
    if (!orig) return NextResponse.json({ error: "العملية غير موجودة" }, { status: 404 });
    const account = await prisma.financeAccount.findFirst({ where: { code: d.method, isActive: true } });
    if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });
    const out = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "LedgerDue" WHERE "entryId" = ${orig.id} FOR UPDATE`;
      if (!lock.length) throw new Error("NODUE");
      const st = await dueOf(tx, orig.id);
      if (!st) throw new Error("NODUE");
      const amt = Math.round(d.amount * 100);
      if (amt > Math.round(st.remaining * 100)) throw new Error("OVER");
      const e = await tx.ledgerEntry.create({
        data: {
          type: "income", category: orig.category, accountId: account.id, amount: amt / 100,
          entryDate: noon(date),
          description: ("تحصيل متبقي" + (orig.description ? " — " + orig.description : "")).slice(0, 300),
          source: "COLLECTION", idempotencyKey: key, createdById: g.actor.id,
        },
      });
      await tx.$executeRaw`INSERT INTO "LedgerDueCollection" ("id", "dueId", "entryId", "amount") VALUES (${randomUUID()}, ${st.id}, ${e.id}, ${amt / 100}::numeric)`;
      await audit(tx, {
        actor: g.actor, action: "COLLECT", entity: "LedgerEntry", entityId: orig.id,
        after: { collectionEntryId: e.id, amount: amt / 100, method: d.method, remaining: Math.round(st.remaining * 100 - amt) / 100 },
      });
      return { id: e.id, remaining: Math.round(st.remaining * 100 - amt) / 100 };
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    const m = (err as Error)?.message;
    if (m === "NODUE") return NextResponse.json({ error: "مفيش مبلغ آجل على العملية دي" }, { status: 404 });
    if (m === "OVER") return NextResponse.json({ error: "المبلغ أكبر من المتبقي" }, { status: 400 });
    console.error("collect failed", err);
    return NextResponse.json({ error: "تعذر التحصيل" }, { status: 500 });
  }
}
