import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    total,
    todayCount,
    upcoming,
    pending,
    confirmed,
    cancelled,
    customersCount,
    feeAgg,
    recentBookings,
    popularServices
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.booking.count({ where: { date: { gt: todayEnd }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.customer.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { verified: true } }),
    prisma.booking.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { customer: true, service: true }
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5
    })
  ]);

  const serviceIds = popularServices.map((p) => p.serviceId);
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  const popular = popularServices.map((p) => ({
    service: services.find((s) => s.id === p.serviceId)?.name || "—",
    count: p._count.serviceId
  }));

  return NextResponse.json({
    total,
    todayCount,
    upcoming,
    pending,
    confirmed,
    cancelled,
    customersCount,
    totalFees: feeAgg._sum.amount || 0,
    recentBookings,
    popularServices: popular
  });
}
