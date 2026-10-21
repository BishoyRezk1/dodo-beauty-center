import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";
import { serializeInvoice } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      payments: { where: { status: "POSTED" }, orderBy: { paidAt: "asc" } },
      refunds: { orderBy: { refundDate: "asc" } },
    },
  });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const accs = await prisma.financeAccount.findMany({ select: { id: true, code: true } });
  const code = new Map<string, string>(accs.map((a) => [a.id, a.code] as [string, string]));
  const customer = inv.customerId
    ? await prisma.customer.findUnique({ where: { id: inv.customerId }, select: { name: true, phone: true } })
    : null;
  return NextResponse.json({
    ...serializeInvoice(inv),
    customer,
    items: inv.items.map((i) => ({
      id: i.id, serviceId: i.serviceId, description: i.description, quantity: i.quantity,
      unitPrice: Number(i.unitPrice), discount: Number(i.discount), lineTotal: Number(i.lineTotal),
    })),
    payments: inv.payments.map((p) => ({
      id: p.id, method: code.get(p.accountId) ?? "", amount: Number(p.amount), paidAt: p.paidAt.toISOString(),
    })),
    refunds: inv.refunds.map((r) => ({
      id: r.id, method: code.get(r.accountId) ?? "", amount: Number(r.amount), reason: r.reason, date: r.refundDate.toISOString(),
    })),
  });
}
