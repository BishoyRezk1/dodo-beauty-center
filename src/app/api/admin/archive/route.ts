import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { buildMonth, monthRe, saveMonth, setLock } from "@/lib/archive";
import { cairoDay } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const month = new URL(req.url).searchParams.get("month");
  if (!month) {
    const rows = await prisma.monthlyArchive.findMany({ select: { month: true, locked: true } });
    return NextResponse.json({ saved: rows.map((r) => r.month), locked: rows.filter((r) => r.locked).map((r) => r.month) });
  }
  if (!monthRe.test(month)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const saved = await prisma.monthlyArchive.findUnique({ where: { month } });
  if (saved) return NextResponse.json({ saved: true, locked: saved.locked, data: saved.data });
  return NextResponse.json({ saved: false, locked: false, data: await buildMonth(month) });
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: { month?: string; action?: string } = {};
  try { body = await req.json(); } catch {}
  const month = body.month;
  if (!month || !monthRe.test(month)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const action = body.action === "lock" || body.action === "unlock" ? body.action : "save";
  const row = await prisma.monthlyArchive.findUnique({ where: { month } });

  if (action === "unlock") {
    if (!row) return NextResponse.json({ error: "الشهر مش محفوظ" }, { status: 404 });
    await setLock(month, false);
    await prisma.$transaction((tx) => audit(tx, { actor: g.actor, action: "UNLOCK", entity: "MonthlyArchive", entityId: row.id, reason: month }));
    return NextResponse.json({ saved: true, locked: false, data: row.data });
  }
  if (row?.locked) return NextResponse.json({ error: "الشهر مقفول. افتحيه الأول" }, { status: 423 });
  if (action === "lock") {
    if (month >= cairoDay(new Date()).slice(0, 7)) return NextResponse.json({ error: "مينفعش تقفلي الشهر الجاري" }, { status: 400 });
    const data = await saveMonth(month);
    await setLock(month, true);
    const r2 = await prisma.monthlyArchive.findUnique({ where: { month }, select: { id: true } });
    await prisma.$transaction((tx) => audit(tx, { actor: g.actor, action: "LOCK", entity: "MonthlyArchive", entityId: r2?.id, reason: month }));
    return NextResponse.json({ saved: true, locked: true, data });
  }
  const data = await saveMonth(month);
  return NextResponse.json({ saved: true, locked: false, data });
}
