import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { cancelSchema, cents, fail, lockInvoice, serializeInvoice } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = cancelSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const out = await prisma.$transaction(async (tx) => {
      const inv = await lockInvoice(tx, params.id);
      if (!inv) throw new Error("NOTFOUND");
      if (inv.status === "CANCELLED") return inv;
      const agg = await tx.invoiceRefund.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } });
      if (cents(inv.paidTotal) - cents(agg._sum.amount ?? 0) > 0) throw new Error("HASPAID");
      const upd = await tx.invoice.update({
        where: { id: inv.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: p.data.reason },
      });
      await audit(tx, {
        actor: g.actor, action: "CANCEL", entity: "Invoice", entityId: inv.id,
        before: serializeInvoice(inv), after: serializeInvoice(upd), reason: p.data.reason,
      });
      return upd;
    });
    return NextResponse.json(serializeInvoice(out));
  } catch (err) {
    return fail(err);
  }
}
