import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { money, toCents } from "@/lib/invoices";

export const dynamic = "force-dynamic";

const code = z.string().regex(/^[a-z_]{1,30}$/);
const schema = z.object({
  from: code,
  to: code,
  amount: z.coerce.number().positive().max(100000000),
  note: z.string().trim().max(200).optional().nullable(),
});

export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const rows = await prisma.accountTransfer.findMany({ where: { status: "POSTED" }, orderBy: { transferDate: "desc" }, take: 50 });
  const accs = await prisma.financeAccount.findMany({ select: { id: true, code: true } });
  const c = new Map<string, string>(accs.map((a) => [a.id, a.code] as [string, string]));
  return NextResponse.json({
    transfers: rows.map((r) => ({
      id: r.id, no: Number(r.transferNo), from: c.get(r.fromAccountId) ?? "", to: c.get(r.toAccountId) ?? "",
      amount: Number(r.amount), date: r.transferDate.toISOString(), note: r.note,
    })),
  });
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  if (d.from === d.to) return NextResponse.json({ error: "اختر حسابين مختلفين" }, { status: 400 });
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  if (key) {
    const ex = await prisma.accountTransfer.findUnique({ where: { idempotencyKey: key } });
    if (ex) return NextResponse.json({ ok: true, duplicate: true });
  }
  const [from, to] = await Promise.all([
    prisma.financeAccount.findFirst({ where: { code: d.from, isActive: true } }),
    prisma.financeAccount.findFirst({ where: { code: d.to, isActive: true } }),
  ]);
  if (!from || !to) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });
  try {
    const t = await prisma.$transaction(async (tx) => {
      const r = await tx.accountTransfer.create({
        data: {
          fromAccountId: from.id, toAccountId: to.id, amount: money(toCents(d.amount)),
          note: d.note || null, idempotencyKey: key, createdById: g.actor.id,
        },
      });
      await audit(tx, {
        actor: g.actor, action: "TRANSFER", entity: "AccountTransfer", entityId: r.id,
        after: { from: d.from, to: d.to, amount: Math.round(d.amount * 100) / 100 }, reason: d.note || undefined,
      });
      return r;
    });
    return NextResponse.json({ ok: true, id: t.id, no: Number(t.transferNo) });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") return NextResponse.json({ ok: true, duplicate: true });
    console.error("transfer failed", err);
    return NextResponse.json({ error: "تعذر التحويل" }, { status: 500 });
  }
}
