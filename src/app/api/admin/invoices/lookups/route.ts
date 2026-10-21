import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const [services, customers] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, price: true, discountPrice: true },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, phone: true } }),
  ]);
  return NextResponse.json({
    services: services.map((s) => ({ id: s.id, name: s.name, price: Number(s.discountPrice ?? s.price) })),
    customers,
  });
}
