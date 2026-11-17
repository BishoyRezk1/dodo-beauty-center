import { NextResponse } from "next/server";
import { staffSchema } from "@/lib/staff";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";


const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.res;

  const [staff, items, payouts] = await Promise.all([
    prisma.staff.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.invoiceItem.groupBy({
      by: ["staffId"],
      where: { staffId: { not: null }, invoice: { status: { not: "CANCELLED" } } },
      _sum: { lineTotal: true, quantity: true },
      _count: { _all: true },
    }),
    prisma.staffPayout.groupBy({ by: ["staffId"], _sum: { amount: true } }),
  ]);

  const itemMap = new Map(items.map((i) => [i.staffId, i]));
  const payMap = new Map(payouts.map((p) => [p.staffId, Number(p._sum.amount || 0)]));

  return NextResponse.json(
    staff.map((s) => {
      const it = itemMap.get(s.id);
      const sales = Number(it?._sum.lineTotal || 0);
      const qty = Number(it?._sum.quantity || 0);
      const cv = Number(s.commissionValue);
      const earned = s.commissionType === "PERCENT" ? (sales * cv) / 100 : qty * cv;
      const paid = payMap.get(s.id) || 0;
      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        isActive: s.isActive,
        commissionType: s.commissionType,
        commissionValue: cv,
        notes: s.notes,
        serviceIds: s.services.map((x) => x.serviceId),
        servicesCount: it?._count._all || 0,
        sales: r2(sales),
        earned: r2(earned),
        paid: r2(paid),
        due: r2(earned - paid),
      };
    })
  );
}

export async function POST(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = staffSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  if (d.commissionType === "PERCENT" && d.commissionValue > 100)
    return NextResponse.json({ error: "percent>100" }, { status: 400 });

  const out = await prisma.$transaction(async (tx) => {
    const s = await tx.staff.create({
      data: {
        name: d.name,
        phone: d.phone || null,
        commissionType: d.commissionType,
        commissionValue: d.commissionValue,
        notes: d.notes || null,
        isActive: d.isActive ?? true,
      },
    });
    if (d.serviceIds?.length) {
      await tx.staffService.createMany({
        data: d.serviceIds.map((serviceId) => ({ staffId: s.id, serviceId })),
        skipDuplicates: true,
      });
    }
    await audit(tx, {
      actor: g.actor, action: "CREATE", entity: "Staff", entityId: s.id,
      before: null, after: { ...d },
    });
    return s;
  });
  return NextResponse.json({ id: out.id });
}
