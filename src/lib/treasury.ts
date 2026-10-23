import { prisma } from "@/lib/prisma";
import { cents } from "@/lib/invoices";

type Acc = {
  id: string;
  code: string;
  name: string;
  openingBalance: unknown;
  openingDate: Date | null;
  openingApprovedAt: Date | null;
};

const s = (v: unknown) => cents(v ?? 0);
const p = (c: number) => Math.round(c) / 100;

export async function summarizeOne(a: Acc) {
  const approved = !!(a.openingApprovedAt && a.openingDate && a.openingBalance !== null && a.openingBalance !== undefined);
  const since = approved ? (a.openingDate as Date) : null;
  const L = since ? { entryDate: { gte: since } } : {};
  const P = since ? { paidAt: { gte: since } } : {};
  const R = since ? { refundDate: { gte: since } } : {};
  const T = since ? { transferDate: { gte: since } } : {};
  const [inc, exp, pay, ref, tin, tout, last] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { accountId: a.id, status: "POSTED", type: "income", ...L }, _sum: { amount: true } }),
    prisma.ledgerEntry.aggregate({ where: { accountId: a.id, status: "POSTED", type: "expense", ...L }, _sum: { amount: true } }),
    prisma.invoicePayment.aggregate({ where: { accountId: a.id, status: "POSTED", ...P }, _sum: { amount: true } }),
    prisma.invoiceRefund.aggregate({ where: { accountId: a.id, ...R }, _sum: { amount: true } }),
    prisma.accountTransfer.aggregate({ where: { toAccountId: a.id, status: "POSTED", ...T }, _sum: { amount: true } }),
    prisma.accountTransfer.aggregate({ where: { fromAccountId: a.id, status: "POSTED", ...T }, _sum: { amount: true } }),
    prisma.accountCount.findFirst({ where: { accountId: a.id }, orderBy: { countedAt: "desc" } }),
  ]);
  const receipts = s(inc._sum.amount) + s(pay._sum.amount);
  const payments = s(exp._sum.amount) + s(ref._sum.amount);
  const tIn = s(tin._sum.amount);
  const tOut = s(tout._sum.amount);
  const opening = approved ? s(a.openingBalance) : null;
  const book = opening === null ? null : opening + receipts - payments + tIn - tOut;
  return {
    code: a.code,
    name: a.name,
    approved,
    openingBalance: opening === null ? null : p(opening),
    openingDate: a.openingDate ? a.openingDate.toISOString().slice(0, 10) : null,
    receipts: p(receipts),
    payments: p(payments),
    transfersIn: p(tIn),
    transfersOut: p(tOut),
    bookBalance: book === null ? null : p(book),
    lastCount: last
      ? { counted: Number(last.countedAmount), book: Number(last.bookAmount), difference: Number(last.difference), date: last.countedAt.toISOString() }
      : null,
  };
}
