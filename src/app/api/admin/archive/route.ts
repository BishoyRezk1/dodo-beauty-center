import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";
import { buildMonth, monthRe, saveMonth } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const month = new URL(req.url).searchParams.get("month");
  if (!month) {
    const rows = await prisma.monthlyArchive.findMany({ select: { month: true } });
    return NextResponse.json({ saved: rows.map((r) => r.month) });
  }
  if (!monthRe.test(month)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const saved = await prisma.monthlyArchive.findUnique({ where: { month } });
  if (saved) return NextResponse.json({ saved: true, data: saved.data });
  return NextResponse.json({ saved: false, data: await buildMonth(month) });
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: { month?: string } = {};
  try { body = await req.json(); } catch {}
  if (!body.month || !monthRe.test(body.month)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const data = await saveMonth(body.month);
  return NextResponse.json({ saved: true, data });
}
