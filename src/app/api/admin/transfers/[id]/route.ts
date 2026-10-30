import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(2).max(200) });

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "اكتبي سبب الإلغاء" }, { status: 400 });
  const t = await prisma.accountTransfer.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (t.status !== "POSTED") return NextResponse.json({ ok: true, already: true });
  await prisma.$transaction(async (tx) => {
    await tx.accountTransfer.update({ where: { id: t.id }, data: { status: "VOID", voidReason: p.data.reason, voidedAt: new Date() } });
    await audit(tx, {
      actor: g.actor, action: "VOID", entity: "AccountTransfer", entityId: t.id,
      before: { amount: Number(t.amount), status: t.status }, after: { status: "VOID" }, reason: p.data.reason,
    });
  });
  return NextResponse.json({ ok: true });
}
