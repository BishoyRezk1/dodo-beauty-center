import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { money, toCents } from "@/lib/invoices";
import { summarizeOne } from "@/lib/treasury";

export const dynamic = "force-dynamic";

const schema = z.object({
  counted: z.coerce.number().min(0).max(100000000),
  note: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const a = await prisma.financeAccount.findFirst({ where: { code: params.code, isActive: true } });
  if (!a) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  if (!a.openingApprovedAt) {
    return NextResponse.json({ error: "اعتمد الرصيد الافتتاحي أولًا" }, { status: 400 });
  }
  const sum = await summarizeOne(a);
  if (sum.bookBalance === null) return NextResponse.json({ error: "اعتمد الرصيد الافتتاحي أولًا" }, { status: 400 });
  const book = Math.round(sum.bookBalance * 100);
  const counted = toCents(p.data.counted);
  const diff = counted - book;
  await prisma.$transaction(async (tx) => {
    const c = await tx.accountCount.create({
      data: {
        accountId: a.id,
        bookAmount: money(book),
        countedAmount: money(counted),
        difference: money(diff),
        note: p.data.note || null,
        createdById: g.actor.id,
      },
    });
    await audit(tx, {
      actor: g.actor,
      action: "COUNT",
      entity: "FinanceAccount",
      entityId: a.id,
      after: { countId: c.id, book: book / 100, counted: counted / 100, difference: diff / 100 },
      reason: p.data.note || undefined,
    });
  });
  return NextResponse.json({ book: book / 100, counted: counted / 100, difference: diff / 100 });
}
