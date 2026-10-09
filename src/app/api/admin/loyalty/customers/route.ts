import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 60);
  let customers: { id: string; name: string; phone: string }[];

  if (q) {
    customers = await prisma.customer.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] },
      take: 20,
      select: { id: true, name: true, phone: true }
    });
  } else {
    const top = await prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 20
    });
    customers = await prisma.customer.findMany({
      where: { id: { in: top.map((t) => t.customerId) } },
      select: { id: true, name: true, phone: true }
    });
  }

  const sums = await prisma.loyaltyTransaction.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((c) => c.id) } },
    _sum: { points: true }
  });
  const map = new Map(sums.map((s) => [s.customerId, s._sum.points ?? 0]));
  const out = customers.map((c) => ({ ...c, balance: map.get(c.id) ?? 0 })).sort((a, b) => b.balance - a.balance);
  return NextResponse.json({ customers: out });
}
