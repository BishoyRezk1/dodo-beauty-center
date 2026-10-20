import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DATE_RE, dayEnd, dayStart } from "@/lib/finance";
import { audit, requireOwner } from "@/lib/ledger";
import { accountId, cents, fail, invoiceSchema, money, serializeInvoice, statusOf, toCents } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const where: Prisma.InvoiceWhereInput = {};
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const range: Prisma.DateTimeFilter = {};
  if (DATE_RE.test(from)) range.gte = dayStart(from);
  if (DATE_RE.test(to)) range.lte = dayEnd(to);
  if (range.gte || range.lte) where.invoiceDate = range;
  const status = sp.get("status") || "";
  if (["ISSUED", "PARTIAL", "PAID", "CANCELLED"].includes(status)) where.status = status;
  const customerId = (sp.get("customerId") || "").slice(0, 40);
  if (customerId) where.customerId = customerId;
  const q = (sp.get("q") || "").trim();
  if (/^\d{1,9}$/.test(q)) where.invoiceNo = BigInt(q);

  const rows = await prisma.invoice.findMany({ where, orderBy: { invoiceDate: "desc" }, take: 200 });
  const ids = Array.from(new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x)));
  const customers = ids.length
    ? await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = new Map<string, string>(customers.map((c) => [c.id, c.name] as [string, string]));
  return NextResponse.json({
    invoices: rows.map((r) => ({ ...serializeInvoice(r), customerName: r.customerId ? names.get(r.customerId) ?? null : null })),
  });
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = invoiceSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });

  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  if (key) {
    const ex = await prisma.invoice.findUnique({ where: { idempotencyKey: key } });
    if (ex) return NextResponse.json(serializeInvoice(ex));
  }

  let customerId = d.customerId || null;
  if (d.bookingId) {
    const b = await prisma.booking.findUnique({ where: { id: d.bookingId }, select: { customerId: true } });
    if (!b) return bad("الحجز غير موجود");
    if (!customerId) customerId = b.customerId;
  }
  if (customerId) {
    const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!c) return bad("العميل غير موجود");
  }

  const sids = Array.from(new Set(d.items.map((i) => i.serviceId).filter((x): x is string => !!x)));
  const services = sids.length
    ? await prisma.service.findMany({ where: { id: { in: sids } }, select: { id: true, name: true, price: true, discountPrice: true } })
    : [];
  const sMap = new Map<string, (typeof services)[number]>(services.map((s) => [s.id, s] as [string, (typeof services)[number]]));

  const lines: { serviceId: string | null; description: string; quantity: number; unit: number; dc: number; line: number }[] = [];
  let sub = 0;
  let disc = 0;
  for (const it of d.items) {
    const s = it.serviceId ? sMap.get(it.serviceId) : undefined;
    if (it.serviceId && !s) return bad("خدمة غير موجودة");
    const unit = it.unitPrice != null ? toCents(it.unitPrice) : s ? cents(s.discountPrice ?? s.price) : null;
    if (unit == null) return bad("السعر مطلوب");
    const description = (it.description || s?.name || "").trim();
    if (!description) return bad("وصف البند مطلوب");
    const gross = unit * it.quantity;
    const dc = toCents(it.discount);
    if (dc > gross) return bad("الخصم أكبر من قيمة البند");
    lines.push({ serviceId: s?.id ?? null, description, quantity: it.quantity, unit, dc, line: gross - dc });
    sub += gross;
    disc += dc;
  }
  const total = sub - disc;
  if (total <= 0) return bad("إجمالي الفاتورة يجب أن يكون أكبر من صفر");
  const paySum = d.payments.reduce((a, x) => a + toCents(x.amount), 0);
  if (paySum > total) return bad("المدفوع أكبر من إجمالي الفاتورة");

  try {
    const inv = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          customerId,
          bookingId: d.bookingId || null,
          subtotal: money(sub),
          discountTotal: money(disc),
          total: money(total),
          paidTotal: money(paySum),
          status: statusOf(total, paySum),
          notes: d.notes || null,
          idempotencyKey: key,
          createdById: g.actor.id,
          items: {
            create: lines.map((l) => ({
              serviceId: l.serviceId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: money(l.unit),
              discount: money(l.dc),
              lineTotal: money(l.line),
            })),
          },
        },
      });
      let n = 0;
      for (const pay of d.payments) {
        const acc = await accountId(tx, pay.method);
        if (!acc) throw new Error("ACCOUNT");
        await tx.invoicePayment.create({
          data: {
            invoiceId: created.id,
            accountId: acc,
            amount: money(toCents(pay.amount)),
            createdById: g.actor.id,
            idempotencyKey: key ? `${key}:p${n}` : null,
          },
        });
        n++;
      }
      await audit(tx, { actor: g.actor, action: "CREATE", entity: "Invoice", entityId: created.id, after: serializeInvoice(created) });
      return created;
    });
    return NextResponse.json(serializeInvoice(inv));
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      if (key) {
        const ex = await prisma.invoice.findUnique({ where: { idempotencyKey: key } });
        if (ex) return NextResponse.json(serializeInvoice(ex));
      }
      return NextResponse.json({ error: "يوجد فاتورة نشطة لهذا الحجز" }, { status: 409 });
    }
    return fail(err);
  }
}
