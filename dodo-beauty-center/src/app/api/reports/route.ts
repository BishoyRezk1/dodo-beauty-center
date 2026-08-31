import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const dateFilter =
    from && to
      ? { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) }
      : undefined;

  const bookings = await prisma.booking.findMany({
    where: dateFilter ? { date: dateFilter } : {},
    include: { customer: true, service: true, payment: true },
    orderBy: { date: "asc" }
  });

  const totalRevenue = bookings
    .filter((b) => b.payment?.verified)
    .reduce((sum, b) => sum + Number(b.payment!.amount), 0);

  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;

  const byDay: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const byCustomer: Record<string, { name: string; count: number }> = {};

  for (const b of bookings) {
    const dayKey = b.date.toISOString().split("T")[0];
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    byService[b.service.name] = (byService[b.service.name] || 0) + 1;
    const key = b.customer.id;
    if (!byCustomer[key]) byCustomer[key] = { name: b.customer.name, count: 0 };
    byCustomer[key].count += 1;
  }

  return NextResponse.json({
    totalBookings: bookings.length,
    totalRevenue,
    cancelledCount,
    dailyBookings: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    popularServices: Object.entries(byService)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count),
    topCustomers: Object.values(byCustomer)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  });
}
