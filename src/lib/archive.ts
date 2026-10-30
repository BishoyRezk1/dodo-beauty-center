import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cairoDay, dailyStatement, isApproved, loadMovements } from "@/lib/treasury";

export const monthRe = /^\d{4}-(0[1-9]|1[0-2])$/;
const c = (v: unknown) => Math.round(Number(v) * 100);
const p = (x: number) => x / 100;

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { first: month + "-01", last: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}

export function prevMonthCairo() {
  const [y, m] = cairoDay(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

type Row = { day: string; ts: string; kind: string; account: string; to: string | null; amount: number; category: string; note: string | null };

export async function buildMonth(month: string) {
  const { first, last } = monthBounds(month);
  const lo = new Date(new Date(first + "T00:00:00.000Z").getTime() - 86400000);
  const hi = new Date(new Date(last + "T23:59:59.999Z").getTime() + 86400000);
  const rng = { gte: lo, lte: hi };
  const inM = (d: string) => d >= first && d <= last;

  const all = await prisma.financeAccount.findMany({ orderBy: { createdAt: "asc" } });
  const name = new Map(all.map((a) => [a.id, a.name] as [string, string]));
  const accounts: Array<{ code: string; name: string; opening: number | null; receipts: number; payments: number; transfersIn: number; transfersOut: number; closing: number | null }> = [];
  for (const a of all.filter((x) => x.isActive)) {
    const o = await dailyStatement(a, first);
    const e = await dailyStatement(a, last);
    const d0 = a.openingDate ? a.openingDate.toISOString().slice(0, 10) : null;
    const mv = isApproved(a) ? (await loadMovements(a, first, last)).filter((m) => !d0 || m.day >= d0) : [];
    let r = 0, pm = 0, ti = 0, to = 0;
    for (const m of mv) {
      if (m.kind === "receipt") r += m.c;
      else if (m.kind === "payment") pm += m.c;
      else if (m.kind === "in") ti += m.c;
      else to += m.c;
    }
    accounts.push({
      code: a.code, name: a.name,
      opening: o.status === "OK" ? o.opening : null,
      receipts: p(r), payments: p(pm), transfersIn: p(ti), transfersOut: p(to),
      closing: e.status === "OK" ? e.closing : null,
    });
  }

  const [led, pays, refs, trs] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { status: "POSTED", entryDate: rng }, include: { account: { select: { name: true } } } }),
    prisma.invoicePayment.findMany({ where: { status: "POSTED", paidAt: rng }, include: { invoice: { select: { invoiceNo: true } } } }),
    prisma.invoiceRefund.findMany({ where: { refundDate: rng }, include: { invoice: { select: { invoiceNo: true } } } }),
    prisma.accountTransfer.findMany({ where: { status: "POSTED", transferDate: rng } }),
  ]);

  const rows: Row[] = [];
  for (const r of led) rows.push({ day: r.entryDate.toISOString().slice(0, 10), ts: r.createdAt.toISOString(), kind: r.type === "income" ? "income" : "expense", account: r.account.name, to: null, amount: Number(r.amount), category: r.category, note: r.description });
  for (const r of pays) rows.push({ day: cairoDay(r.paidAt), ts: r.paidAt.toISOString(), kind: "invoice_in", account: name.get(r.accountId) ?? "", to: null, amount: Number(r.amount), category: "فاتورة #" + Number(r.invoice.invoiceNo), note: null });
  for (const r of refs) rows.push({ day: cairoDay(r.refundDate), ts: r.refundDate.toISOString(), kind: "refund", account: name.get(r.accountId) ?? "", to: null, amount: Number(r.amount), category: "استرداد فاتورة #" + Number(r.invoice.invoiceNo), note: null });
  for (const r of trs) rows.push({ day: cairoDay(r.transferDate), ts: r.transferDate.toISOString(), kind: "transfer", account: name.get(r.fromAccountId) ?? "", to: name.get(r.toAccountId) ?? "", amount: Number(r.amount), category: "تحويل #" + Number(r.transferNo), note: r.note });

  const list = rows.filter((r) => inM(r.day)).sort((x, y) => (x.day === y.day ? x.ts.localeCompare(y.ts) : x.day.localeCompare(y.day)));
  let inc = 0, exp = 0, tr = 0;
  for (const r of list) {
    if (r.kind === "income" || r.kind === "invoice_in") inc += c(r.amount);
    else if (r.kind === "expense" || r.kind === "refund") exp += c(r.amount);
    else tr += c(r.amount);
  }
  return { month, generatedAt: new Date().toISOString(), accounts, rows: list, totals: { income: p(inc), expense: p(exp), net: p(inc - exp), transfers: p(tr) } };
}

export async function saveMonth(month: string) {
  const data = await buildMonth(month);
  const json = data as unknown as Prisma.InputJsonValue;
  await prisma.monthlyArchive.upsert({ where: { month }, create: { month, data: json }, update: { data: json, savedAt: new Date() } });
  return data;
}

export async function monthLocked(month: string) {
  try {
    const r = await prisma.monthlyArchive.findUnique({ where: { month }, select: { locked: true } });
    return !!r?.locked;
  } catch {
    return false;
  }
}

export async function setLock(month: string, locked: boolean) {
  await prisma.monthlyArchive.update({ where: { month }, data: { locked } });
}
