import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().min(1).max(40), note: z.string().trim().min(2).max(200) });

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "اكتبي سبب التسوية" }, { status: 400 });
  const c = await prisma.accountCount.findUnique({ where: { id: p.data.id } });
  if (!c) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (Number(c.difference) === 0) return NextResponse.json({ error: "الجرد مطابق، مفيش عجز" }, { status: 400 });
  if (c.settledAt) return NextResponse.json({ error: "اتسوّى قبل كده" }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.accountCount.update({ where: { id: c.id }, data: { settledAt: new Date(), settleNote: p.data.note } });
    await audit(tx, {
      actor: g.actor, action: "SETTLE", entity: "AccountCount", entityId: c.id,
      after: { difference: Number(c.difference), note: p.data.note }, reason: p.data.note,
    });
  });
  return NextResponse.json({ ok: true });
}
