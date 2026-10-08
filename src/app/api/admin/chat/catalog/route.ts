import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [services, offers] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, durationMin: true }
    }),
    prisma.offer.findMany({
      where: { isActive: true, endDate: { gte: new Date() } },
      orderBy: { endDate: "asc" },
      select: { id: true, title: true, newPrice: true }
    })
  ]);
  return NextResponse.json({
    services,
    offers: offers.map((o) => ({ ...o, newPrice: Number(o.newPrice) }))
  });
}
