import { z } from "zod";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export const METHODS = ["cash", "vodafone_cash"] as const;
export const toCents = (n: number) => Math.round(n * 100);
export const cents = (d: unknown) => Math.round(Number(d) * 100);
export const money = (c: number) => (c / 100).toFixed(2);
export const statusOf = (total: number, paid: number) =>
  paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "ISSUED";

const amount = z.coerce.number().positive().max(10000000);
const refId = z.string().min(1).max(40);

export const itemSchema = z.object({
  serviceId: refId.optional().nullable(),
  description: z.string().trim().max(120).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  unitPrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
  discount: z.coerce.number().min(0).max(10000000).default(0),
});
export const payInSchema = z.object({ method: z.enum(METHODS), amount });
export const invoiceSchema = z.object({
  customerId: refId.optional().nullable(),
  bookingId: refId.optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  items: z.array(itemSchema).min(1).max(30),
  payments: z.array(payInSchema).max(5).default([]),
});
export const refundSchema = payInSchema.extend({ reason: z.string().trim().min(3).max(200) });
export const cancelSchema = z.object({ reason: z.string().trim().min(3).max(200) });

type Inv = {
  id: string; invoiceNo: bigint; customerId: string | null; bookingId: string | null;
  invoiceDate: Date; subtotal: unknown; discountTotal: unknown; total: unknown;
  paidTotal: unknown; status: string; notes: string | null; cancelReason: string | null;
};

export function serializeInvoice(i: Inv) {
  const total = Number(i.total);
  const paid = Number(i.paidTotal);
  return {
    id: i.id,
    invoiceNo: Number(i.invoiceNo),
    customerId: i.customerId,
    bookingId: i.bookingId,
    date: i.invoiceDate.toISOString(),
    subtotal: Number(i.subtotal),
    discount: Number(i.discountTotal),
    total,
    paid,
    remaining: Math.round((total - paid) * 100) / 100,
    status: i.status,
    notes: i.notes,
    cancelReason: i.cancelReason,
  };
}

export async function accountId(tx: Prisma.TransactionClient, code: string) {
  const a = await tx.financeAccount.findFirst({ where: { code, isActive: true }, select: { id: true } });
  return a?.id ?? null;
}

export async function lockInvoice(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${id} FOR UPDATE`;
  return tx.invoice.findUnique({ where: { id } });
}

const MSG: Record<string, [string, number]> = {
  NOTFOUND: ["الفاتورة غير موجودة", 404],
  CANCELLED: ["الفاتورة ملغاة", 409],
  OVER: ["المبلغ أكبر من المتبقي", 400],
  ACCOUNT: ["الحساب غير موجود", 400],
  REFUNDOVER: ["الاسترداد أكبر من المبلغ المحصل", 400],
  REFUNDACC: ["المبلغ المحصل في هذا الحساب أقل من الاسترداد", 400],
  HASPAID: ["استرد المبالغ المحصلة أولًا ثم ألغِ الفاتورة", 409],
};

export function fail(err: unknown) {
  const hit = MSG[(err as Error)?.message];
  if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });
  console.error("invoice op failed", err);
  return NextResponse.json({ error: "تعذر تنفيذ العملية" }, { status: 500 });
}
