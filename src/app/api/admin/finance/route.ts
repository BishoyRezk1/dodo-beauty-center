import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DATE_RE, bucket, cairoToday, dayEnd, dayStart, entrySchema, noon } from "@/lib/finance";
import { audit, requireOwner, serializeLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const cairoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" });
const cDay = (d: Date) => cairoFmt.format(d);
const DAYMS = 86400000;

type OutRow = {
  id: string;
  type: string;
  amount: number;
  category: string;
  method: string;
  date: string;
  description: string | null;
  source: "LEDGER" | "INVOICE";
  invoiceNo?: number;
  ts: number;
};

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;

  const sp = new URL(req.url).searchParams;
  const today = cairoToday();
  const monthStart = today.slice(0, 8) + "01";
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  let from = sp.get("from") || "";
  let to = sp.get("to") || "";
  if (!DATE_RE.test(from)) from = "";
  if (!DATE_RE.test(to)) to = "";
  const type = sp.get("type");
  const method = sp.get("method") || "";
  const q = (sp.get("q") || "").trim().slice(0, 60);

  const hasRange = !!(from || to);
  const dayFrom = hasRange ? from : monthStart;
  const dayTo = hasRange ? to : monthEndStr;

  const range: Prisma.DateTimeFilter = {};
  if (!hasRange) {
    range.gte = dayStart(monthStart);
    range.lte = monthEnd;
  } else {
    if (from) range.gte = dayStart(from);
    if (to) range.lte = dayEnd(to);
  }
  const where: Prisma.LedgerEntryWhereInput = { entryDate: range, status: "POSTED" };
  if (type === "income" || type === "expense") where.type = type;
  if (/^[a-z_]{1,30}$/.test(method)) where.account = { code: method };
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  // نافذة زمنية واسعة لدفعات ومستردات الفواتير (تغطي الفلتر + الشهر الحالي)
  const lowOpen = hasRange && !from;
  const highOpen = hasRange && !to;
  const winLo = lowOpen ? null : dayFrom && dayFrom < monthStart ? dayFrom : monthStart;
  const winHi = highOpen ? null : dayTo && dayTo > monthEndStr ? dayTo : monthEndStr;
  const timeWin: Prisma.DateTimeFilter = {};
  if (winLo) timeWin.gte = new Date(dayStart(winLo).getTime() - DAYMS);
  if (winHi) timeWin.lte = new Date(dayEnd(winHi).getTime() + DAYMS);

  const [rows, grouped, monthRaw, accs, pays, refs] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      include: { account: { select: { code: true } } },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: 501,
    }),
    prisma.ledgerEntry.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED", entryDate: { gte: dayStart(monthStart), lte: monthEnd } },
      select: { type: true, amount: true, entryDate: true, account: { select: { code: true } } },
    }),
    prisma.financeAccount.findMany({ select: { id: true, code: true } }),
    prisma.invoicePayment.findMany({
      where: { status: "POSTED", paidAt: timeWin },
      select: { id: true, accountId: true, amount: true, paidAt: true, invoice: { select: { invoiceNo: true } } },
    }),
    prisma.invoiceRefund.findMany({
      where: { refundDate: timeWin },
      select: { id: true, accountId: true, amount: true, refundDate: true, reason: true, invoice: { select: { invoiceNo: true } } },
    }),
  ]);

  const codeOf = new Map(accs.map((a) => [a.id, a.code] as const));
  const allInv: OutRow[] = [];
  for (const p of pays) {
    const code = codeOf.get(p.accountId);
    if (!code) continue;
    const no = Number(p.invoice.invoiceNo);
    allInv.push({
      id: "inv-pay-" + p.id, type: "income", amount: Number(p.amount), category: "دفعة فاتورة",
      method: code, date: cDay(p.paidAt), description: "فاتورة #" + no, source: "INVOICE", invoiceNo: no, ts: p.paidAt.getTime(),
    });
  }
  for (const r of refs) {
    const code = codeOf.get(r.accountId);
    if (!code) continue;
    const no = Number(r.invoice.invoiceNo);
    allInv.push({
      id: "inv-ref-" + r.id, type: "expense", amount: Number(r.amount), category: "استرداد فاتورة",
      method: code, date: cDay(r.refundDate), description: "فاتورة #" + no + (r.reason ? " — " + r.reason : ""),
      source: "INVOICE", invoiceNo: no, ts: r.refundDate.getTime(),
    });
  }

  const ql = q.toLowerCase();
  const invFiltered = allInv.filter(
    (r) =>
      (!dayFrom || r.date >= dayFrom) &&
      (!dayTo || r.date <= dayTo) &&
      (type !== "income" && type !== "expense" ? true : r.type === type) &&
      (!/^[a-z_]{1,30}$/.test(method) || r.method === method) &&
      (!q ||
        r.category.toLowerCase().includes(ql) ||
        (r.description || "").toLowerCase().includes(ql) ||
        String(r.invoiceNo ?? "").includes(q))
  );

  const ledgerRows: OutRow[] = rows.slice(0, 500).map((e) => ({
    ...serializeLedger(e),
    source: "LEDGER" as const,
    ts: e.createdAt.getTime(),
  }));
  const merged = [...ledgerRows, ...invFiltered].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts
  );

  const monthRows = [
    ...monthRaw.map((r) => ({
      type: r.type, method: r.account.code, amount: r.amount as unknown, day: r.entryDate.toISOString().slice(0, 10),
    })),
    ...allInv
      .filter((r) => r.date >= monthStart && r.date <= monthEndStr)
      .map((r) => ({ type: r.type, method: r.method, amount: r.amount as unknown, day: r.date })),
  ];
  const todayRows = monthRows.filter((r) => r.day === today);

  const sumOf = (t: string) => Number(grouped.find((x) => x.type === t)?._sum.amount ?? 0);
  const invSum = (t: string) => invFiltered.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0);
  const income = sumOf("income") + invSum("income");
  const expense = sumOf("expense") + invSum("expense");

  return NextResponse.json({
    entries: merged.slice(0, 500).map(({ ts: _ts, ...r }) => r),
    truncated: rows.length > 500 || merged.length > 500,
    totals: {
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    },
    summary: { today: bucket(todayRows), month: bucket(monthRows) },
  });
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const p = entrySchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;

  const account = await prisma.financeAccount.findFirst({ where: { code: d.method, isActive: true } });
  if (!account) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });

  const amount = Math.round(d.amount * 100) / 100;
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;
  const include = { account: { select: { code: true } } };

  if (key) {
    const ex = await prisma.ledgerEntry.findUnique({ where: { idempotencyKey: key }, include });
    if (ex) return NextResponse.json(serializeLedger(ex));
  }
  const dup = await prisma.ledgerEntry.findFirst({
    where: {
      status: "POSTED",
      createdAt: { gte: new Date(Date.now() - 15000) },
      createdById: g.actor.id,
      type: d.type,
      category: d.category,
      accountId: account.id,
      amount,
      entryDate: noon(d.date),
      description: d.description || null,
    },
    include,
  });
  if (dup) return NextResponse.json(serializeLedger(dup));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const e = await tx.ledgerEntry.create({
        data: {
          type: d.type,
          category: d.category,
          accountId: account.id,
          amount,
          entryDate: noon(d.date),
          description: d.description || null,
          source: "MANUAL",
          idempotencyKey: key,
          createdById: g.actor.id,
        },
        include,
      });
      await audit(tx, {
        actor: g.actor,
        action: "CREATE",
        entity: "LedgerEntry",
        entityId: e.id,
        after: serializeLedger(e),
      });
      return e;
    });
    return NextResponse.json(serializeLedger(created));
  } catch (err) {
    if (key) {
      const ex = await prisma.ledgerEntry.findUnique({ where: { idempotencyKey: key }, include });
      if (ex) return NextResponse.json(serializeLedger(ex));
    }
    console.error("ledger create failed", err);
    return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  }
}
