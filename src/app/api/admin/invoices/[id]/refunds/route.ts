import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { accountId, cents, fail, lockInvoice, money, refundSchema, serializeInvoice, toCents } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = refundSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  if (key) {
    const ex = await prisma.invoiceRefund.findUnique({ where: { idempotencyKey: key } });
    if (ex) return NextResponse.json({ ok: true, duplicate: true });
  }
  try {
    const refund = await prisma.$transaction(async (tx) => {
      const inv = await lockInvoice(tx, params.id);
      if (!inv) throw new Error("NOTFOUND");
      if (inv.status === "CANCELLED") throw new Error("CANCELLED");
      const agg = await tx.invoiceRefund.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } });
      const refunded = cents(agg._sum.amount ?? 0);
      const amt = toCents(d.amount);
      if (amt > cents(inv.paidTotal) - refunded) throw new Error("REFUNDOVER");
      const acc = await accountId(tx, d.method);
      if (!acc) throw new Error("ACCOUNT");
      const r = await tx.invoiceRefund.create({
        data: { invoiceId: inv.id, accountId: acc, amount: money(amt), reason: d.reason, createdById: g.actor.id, idempotencyKey: key },
      });
      await audit(tx, {
        actor: g.actor, action: "REFUND", entity: "Invoice", entityId: inv.id,
        before: serializeInvoice(inv), after: { refundId: r.id, amount: Number(r.amount), method: d.method }, reason: d.reason,
      });
      return r;
    });
    return NextResponse.json({ ok: true, id: refund.id });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") return NextResponse.json({ ok: true, duplicate: true });
    return fail(err);
  }
}
