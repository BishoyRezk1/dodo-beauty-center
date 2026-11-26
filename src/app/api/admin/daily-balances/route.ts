import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";
import { cairoDay, dailySeries } from "@/lib/treasury";

export const dynamic = "force-dynamic";
const RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const sp = new URL(req.url).searchParams;
  const today = cairoDay(new Date());
  let from = sp.get("from") || today;
  let to = sp.get("to") || from;
  if (!RE.test(from)) from = today;
  if (!RE.test(to)) to = from;
  if (to < from) [from, to] = [to, from];
  if (new Date(to).getTime() - new Date(from).getTime() > 366 * 86400000)
    return NextResponse.json({ error: "المدى أكبر من سنة" }, { status: 400 });
  const accs = await prisma.financeAccount.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  const accounts = await Promise.all(
    accs.map(async (a) => ({ code: a.code, name: a.name, ...(await dailySeries(a, from, to)) }))
  );
  return NextResponse.json({ from, to, accounts });
}
