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
export type Mv = { day: string; kind: "receipt" | "payment" | "in" | "out"; c: number };

const fmtCairo = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" });
export const cairoDay = (d: Date) => fmtCairo.format(d);
const s = (v: unknown) => cents(v ?? 0);
const p = (c: number) => Math.round(c) / 100;
const DAY = 86400000;

export function isApproved(a: Acc) {
  return !!(a.openingApprovedAt && a.openingDate && a.openingBalance !== null && a.openingBalance !== undefined);
}

export async function loadMovements(a: Acc, fromDay: string | null, toDay: string | null): Promise<Mv[]> {
  const lo = fromDay ? new Date(new Date(fromDay + "T00:00:00.000Z").getTime() - DAY) : null;
  const hi = toDay ? new Date(new Date(toDay + "T23:59:59.999Z").getTime() + DAY) : null;
  const rng = { ...(lo ? { gte: lo } : {}), ...(hi ? { lte: hi } : {}) };
  const hasR = !!(lo || hi);
  const [led, pay, ref, tin, tout] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { accountId: a.id, status: "POSTED", ...(hasR ? { entryDate: rng } : {}) },
      select: { type: true, amount: true, entryDate: true },
    }),
    prisma.invoicePayment.findMany({
      where: { accountId: a.id, status: "POSTED", ...(hasR ? { paidAt: rng } : {}) },
      select: { amount: true, paidAt: true },
    }),
    prisma.invoiceRefund.findMany({
      where: { accountId: a.id, ...(hasR ? { refundDate: rng } : {}) },
      select: { amount: true, refundDate: true },
    }),
    prisma.accountTransfer.findMany({
      where: { toAccountId: a.id, status: "POSTED", ...(hasR ? { transferDate: rng } : {}) },
      select: { amount: true, transferDate: true },
    }),
    prisma.accountTransfer.findMany({
      where: { fromAccountId: a.id, status: "POSTED", ...(hasR ? { transferDate: rng } : {}) },
      select: { amount: true, transferDate: true },
    }),
  ]);
  const out: Mv[] = [];
  for (const r of led) out.push({ day: r.entryDate.toISOString().slice(0, 10), kind: r.type === "income" ? "receipt" : "payment", c: s(r.amount) });
  for (const r of pay) out.push({ day: cairoDay(r.paidAt), kind: "receipt", c: s(r.amount) });
  for (const r of ref) out.push({ day: cairoDay(r.refundDate), kind: "payment", c: s(r.amount) });
  for (const r of tin) out.push({ day: cairoDay(r.transferDate), kind: "in", c: s(r.amount) });
  for (const r of tout) out.push({ day: cairoDay(r.transferDate), kind: "out", c: s(r.amount) });
  return out.filter((m) => (!fromDay || m.day >= fromDay) && (!toDay || m.day <= toDay));
}

export async function summarizeOne(a: Acc) {
  const approved = isApproved(a);
  const d0 = approved && a.openingDate ? a.openingDate.toISOString().slice(0, 10) : null;
  const mv = await loadMovements(a, d0, null);
  let receipts = 0;
  let payments = 0;
  let tIn = 0;
  let tOut = 0;
  for (const m of mv) {
    if (m.kind === "receipt") receipts += m.c;
    else if (m.kind === "payment") payments += m.c;
    else if (m.kind === "in") tIn += m.c;
    else tOut += m.c;
  }
  const opening = approved ? s(a.openingBalance) : null;
  const book = opening === null ? null : opening + receipts - payments + tIn - tOut;
  const last = await prisma.accountCount.findFirst({ where: { accountId: a.id }, orderBy: { countedAt: "desc" } });
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

export async function dailyStatement(a: Acc, date: string) {
  const base = { code: a.code, name: a.name };
  if (!isApproved(a) || !a.openingDate) return { ...base, status: "NO_OPENING" as const };
  const d0 = a.openingDate.toISOString().slice(0, 10);
  if (date < d0) return { ...base, status: "BEFORE_START" as const, startDate: d0 };
  const mv = await loadMovements(a, d0, date);
  let opening = s(a.openingBalance);
  let receipts = 0;
  let payments = 0;
  let tIn = 0;
  let tOut = 0;
  for (const m of mv) {
    if (m.day < date) {
      opening += m.kind === "receipt" || m.kind === "in" ? m.c : -m.c;
    } else if (m.kind === "receipt") receipts += m.c;
    else if (m.kind === "payment") payments += m.c;
    else if (m.kind === "in") tIn += m.c;
    else tOut += m.c;
  }
  const closing = opening + receipts - payments + tIn - tOut;
  return {
    ...base,
    status: "OK" as const,
    opening: p(opening),
    receipts: p(receipts),
    payments: p(payments),
    transfersIn: p(tIn),
    transfersOut: p(tOut),
    closing: p(closing),
  };
}
