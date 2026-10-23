import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DATE_RE, dayStart } from "@/lib/finance";
import { audit, requireOwner } from "@/lib/ledger";
import { money, toCents } from "@/lib/invoices";
import { summarizeOne } from "@/lib/treasury";

export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.coerce.number().min(0).max(100000000),
  date: z.string().regex(DATE_RE).refine((v) => !isNaN(new Date(v + "T00:00:00.000Z").getTime()), "bad date"),
  reason: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;

  const a = await prisma.financeAccount.findFirst({ where: { code: params.code, isActive: true } });
  if (!a) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  const had = !!a.openingApprovedAt;
  const reason = (d.reason || "").trim();
  if (had && reason.length < 3) {
    return NextResponse.json({ error: "سبب التعديل مطلوب (3 حروف على الأقل)" }, { status: 400 });
  }
  const before = {
    balance: a.openingBalance === null ? null : Number(a.openingBalance),
    date: a.openingDate ? a.openingDate.toISOString().slice(0, 10) : null,
  };
  const upd = await prisma.$transaction(async (tx) => {
    const u = await tx.financeAccount.update({
      where: { id: a.id },
      data: { openingBalance: money(toCents(d.amount)), openingDate: dayStart(d.date), openingApprovedAt: new Date() },
    });
    await audit(tx, {
      actor: g.actor,
      action: had ? "OPENING_CHANGE" : "OPENING_SET",
      entity: "FinanceAccount",
      entityId: a.id,
      before,
      after: { balance: Math.round(d.amount * 100) / 100, date: d.date },
      reason: reason || undefined,
    });
    return u;
  });
  return NextResponse.json(await summarizeOne(upd));
}
