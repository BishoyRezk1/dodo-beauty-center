import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const [products, customers] = await Promise.all([
    prisma.shopProduct.findMany({
      where: { isActive: true, isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, stock: true },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, phone: true } }),
  ]);
  return NextResponse.json({
    products: products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), stock: p.stock })),
    customers,
  });
}
