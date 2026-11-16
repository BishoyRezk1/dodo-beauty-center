import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ORDER_STATUSES, orderDto } from "@/lib/shop/admin";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const q = (sp.get("q") || "").trim().slice(0, 60);
    const where: Prisma.ShopOrderWhereInput = {};
    if (status && (ORDER_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (q) {
      const or: Prisma.ShopOrderWhereInput[] = [
        { customerName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } }
      ];
      if (/^\d{1,12}$/.test(q)) or.push({ orderNo: BigInt(q) });
      where.OR = or;
    }
    const rows = await prisma.shopOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: true }
    });
    return NextResponse.json({ items: rows.map(orderDto) });
  } catch {
    return fail("تعذر تحميل الطلبات", 500);
  }
}
