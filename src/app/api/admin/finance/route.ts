import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DATE_RE, bucket, cairoToday, dayEnd, dayStart, entrySchema, noon, serialize } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const today = cairoToday();
  const monthStart = today.slice(0, 8) + "01";
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  let from = sp.get("from") || "";
  let to = sp.get("to") || "";
  if (!DATE_RE.test(from)) from = "";
  if (!DATE_RE.test(to)) to = "";
  const type = sp.get("type");
  const method = sp.get("method");
  const q = (sp.get("q") || "").trim().slice(0, 60);

  const range: Prisma.DateTimeFilter = {};
  if (!from && !to) {
    range.gte = dayStart(monthStart);
    range.lte = monthEnd;
  } else {
    if (from) range.gte = dayStart(from);
    if (to) range.lte = dayEnd(to);
  }
  const where: Prisma.FinanceEntryWhereInput = { entryDate: range };
  if (type === "income" || type === "expense") where.type = type;
  if (method === "cash" || method === "vodafone_cash") where.method = method;
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, grouped, monthRows] = await Promise.all([
    prisma.financeEntry.findMany({
      where,
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: 501,
    }),
    prisma.financeEntry.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    prisma.financeEntry.findMany({
      where: { entryDate: { gte: dayStart(monthStart), lte: monthEnd } },
      select: { type: true, method: true, amount: true, entryDate: true },
    }),
  ]);

  const todayRows = monthRows.filter((r) => r.entryDate.toISOString().slice(0, 10) === today);
  const sumOf = (t: string) => Number(grouped.find((g) => g.type === t)?._sum.amount ?? 0);
  const income = sumOf("income");
  const expense = sumOf("expense");

  return NextResponse.json({
    entries: rows.slice(0, 500).map(serialize),
    truncated: rows.length > 500,
    totals: { income, expense, net: Math.round((income - expense) * 100) / 100 },
    summary: { today: bucket(todayRows), month: bucket(monthRows) },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = entrySchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;

  const e = await prisma.financeEntry.create({
    data: {
      type: d.type,
      amount: Math.round(d.amount * 100) / 100,
      category: d.category,
      method: d.method,
      entryDate: noon(d.date),
      description: d.description || null,
    },
  });
  return NextResponse.json(serialize(e));
}
