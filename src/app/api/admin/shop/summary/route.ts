import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const [newOrders, pendingPayments, stock] = await Promise.all([
      prisma.shopOrder.count({ where: { status: { in: ["NEW", "AWAITING_CONFIRMATION"] } } }),
      prisma.shopOrder.count({ where: { paymentStatus: "PENDING_REVIEW", status: { not: "CANCELLED" } } }),
      prisma.$queryRaw<{ low: number; out: number }[]>`
        SELECT
          COUNT(*) FILTER (WHERE "stock" > 0 AND "stock" <= "lowStockAt")::int AS low,
          COUNT(*) FILTER (WHERE "stock" <= 0)::int AS out
        FROM "ShopProduct" WHERE "isArchived" = false AND "isActive" = true`
    ]);
    return NextResponse.json({
      newOrders,
      pendingPayments,
      lowStock: Number(stock[0]?.low ?? 0),
      outOfStock: Number(stock[0]?.out ?? 0)
    });
  } catch {
    return fail("تعذر تحميل الملخص", 500);
  }
}
