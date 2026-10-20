import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DATE_RE, bucket, cairoToday, dayEnd, dayStart, entrySchema, noon } from "@/lib/finance";
import { audit, requireOwner, serializeLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;

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
  const method = sp.get("method") || "";
  const q = (sp.get("q") || "").trim().slice(0, 60);

  const range: Prisma.DateTimeFilter = {};
  if (!from && !to) {
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

  const [rows, grouped, monthRaw] = await Promise.all([
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
  ]);

  const monthRows = monthRaw.map((r) => ({
    type: r.type,
    method: r.account.code,
    amount: r.amount,
    entryDate: r.entryDate,
  }));
  const todayRows = monthRows.filter((r) => r.entryDate.toISOString().slice(0, 10) === today);
  const sumOf = (t: string) => Number(grouped.find((x) => x.type === t)?._sum.amount ?? 0);
  const income = sumOf("income");
  const expense = sumOf("expense");

  return NextResponse.json({
    entries: rows.slice(0, 500).map(serializeLedger),
    truncated: rows.length > 500,
    totals: { income, expense, net: Math.round((income - expense) * 100) / 100 },
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
