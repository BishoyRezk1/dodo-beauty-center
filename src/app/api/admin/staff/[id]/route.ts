import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { staffSchema } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = staffSchema.partial().safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.staff.findUnique({
        where: { id: params.id },
        include: { services: { select: { serviceId: true } } },
      });
      if (!before) throw new Error("NOTFOUND");
      const type = d.commissionType ?? before.commissionType;
      const val = d.commissionValue ?? Number(before.commissionValue);
      if (type === "PERCENT" && val > 100) throw new Error("PERCENT");

      await tx.staff.update({
        where: { id: params.id },
        data: {
          ...(d.name !== undefined && { name: d.name }),
          ...(d.phone !== undefined && { phone: d.phone || null }),
          ...(d.commissionType !== undefined && { commissionType: d.commissionType }),
          ...(d.commissionValue !== undefined && { commissionValue: d.commissionValue }),
          ...(d.notes !== undefined && { notes: d.notes || null }),
          ...(d.isActive !== undefined && { isActive: d.isActive }),
        },
      });
      if (d.serviceIds) {
        await tx.staffService.deleteMany({ where: { staffId: params.id } });
        if (d.serviceIds.length)
          await tx.staffService.createMany({
            data: d.serviceIds.map((serviceId) => ({ staffId: params.id, serviceId })),
            skipDuplicates: true,
          });
      }
      await audit(tx, {
        actor: g.actor, action: "UPDATE", entity: "Staff", entityId: params.id,
        before: { ...before, commissionValue: Number(before.commissionValue) }, after: d,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const m = (err as Error).message;
    if (m === "NOTFOUND") return NextResponse.json({ error: "not found" }, { status: 404 });
    if (m === "PERCENT") return NextResponse.json({ error: "percent>100" }, { status: 400 });
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
