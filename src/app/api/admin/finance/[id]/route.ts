import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrySchema, noon } from "@/lib/finance";
import { audit, requireOwner, serializeLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const include = { account: { select: { code: true } } };

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const before = await prisma.ledgerEntry.findFirst({
    where: { id: params.id, status: "POSTED" },
    include,
  });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const e = await tx.ledgerEntry.update({
      where: { id: params.id },
      data: {
        type: d.type,
        category: d.category,
        accountId: account.id,
        amount: Math.round(d.amount * 100) / 100,
        entryDate: noon(d.date),
        description: d.description || null,
      },
      include,
    });
    await audit(tx, {
      actor: g.actor,
      action: "UPDATE",
      entity: "LedgerEntry",
      entityId: e.id,
      before: serializeLedger(before),
      after: serializeLedger(e),
    });
    return e;
  });
  return NextResponse.json(serializeLedger(updated));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;

  let reason = "إلغاء من الواجهة";
  try {
    const b = (await req.json()) as { reason?: unknown };
    if (typeof b?.reason === "string" && b.reason.trim()) reason = b.reason.trim().slice(0, 200);
  } catch {}

  const e = await prisma.ledgerEntry.findUnique({ where: { id: params.id }, include });
  if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (e.status === "VOID") return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.update({
      where: { id: params.id },
      data: { status: "VOID", voidedAt: new Date(), voidReason: reason },
    });
    await audit(tx, {
      actor: g.actor,
      action: "VOID",
      entity: "LedgerEntry",
      entityId: params.id,
      before: serializeLedger(e),
      reason,
    });
  });
  return NextResponse.json({ ok: true });
}
