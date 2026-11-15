import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.shopCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true, isArchived: false } } } } }
    });
    const items = rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      productCount: c._count.products
    }));
    return NextResponse.json({ items });
  } catch {
    return fail("تعذر تحميل التصنيفات", 500);
  }
}
