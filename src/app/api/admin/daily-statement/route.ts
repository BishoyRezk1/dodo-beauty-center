import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DATE_RE, cairoToday } from "@/lib/finance";
import { requireOwner } from "@/lib/ledger";
import { dailyStatement } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const q = new URL(req.url).searchParams.get("date") || "";
  const date = DATE_RE.test(q) ? q : cairoToday();
  if (isNaN(new Date(date + "T00:00:00.000Z").getTime())) {
    return NextResponse.json({ error: "تاريخ غير صحيح" }, { status: 400 });
  }
  const accounts = await prisma.financeAccount.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "asc" }, { code: "asc" }],
  });
  const out: Awaited<ReturnType<typeof dailyStatement>>[] = [];
  for (const a of accounts) out.push(await dailyStatement(a, date));
  return NextResponse.json({ date, accounts: out });
}
