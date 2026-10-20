import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { accountId, cents, fail, lockInvoice, money, payInSchema, serializeInvoice, statusOf, toCents } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = payInSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  if (key) {
    const ex = await prisma.invoicePayment.findUnique({ where: { idempotencyKey: key } });
    if (ex) {
      const inv = await prisma.invoice.findUnique({ where: { id: ex.invoiceId } });
      if (inv) return NextResponse.json(serializeInvoice(inv));
    }
  }
  try {
    const out = await prisma.$transaction(async (tx) => {
      const inv = await lockInvoice(tx, params.id);
      if (!inv) throw new Error("NOTFOUND");
      if (inv.status === "CANCELLED") throw new Error("CANCELLED");
      const total = cents(inv.total);
      const paid = cents(inv.paidTotal);
      const amt = toCents(d.amount);
      if (amt > total - paid) throw new Error("OVER");
      const acc = await accountId(tx, d.method);
      if (!acc) throw new Error("ACCOUNT");
      await tx.invoicePayment.create({
        data: { invoiceId: inv.id, accountId: acc, amount: money(amt), createdById: g.actor.id, idempotencyKey: key },
      });
      const upd = await tx.invoice.update({
        where: { id: inv.id },
        data: { paidTotal: money(paid + amt), status: statusOf(total, paid + amt) },
      });
      await audit(tx, {
        actor: g.actor, action: "PAYMENT", entity: "Invoice", entityId: inv.id,
        before: serializeInvoice(inv), after: serializeInvoice(upd),
      });
      return upd;
    });
    return NextResponse.json(serializeInvoice(out));
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002" && key) {
      const ex = await prisma.invoicePayment.findUnique({ where: { idempotencyKey: key } });
      const inv = ex ? await prisma.invoice.findUnique({ where: { id: ex.invoiceId } }) : null;
      if (inv) return NextResponse.json(serializeInvoice(inv));
    }
    return fail(err);
  }
}
