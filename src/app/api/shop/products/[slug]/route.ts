import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, productDto } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    let slug = params.slug;
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    const p = await prisma.shopProduct.findFirst({
      where: { slug, isActive: true, isArchived: false },
      include: { category: true }
    });
    if (!p) return fail("المنتج غير موجود", 404);
    const related = await prisma.shopProduct.findMany({
      where: {
        isActive: true,
        isArchived: false,
        id: { not: p.id },
        ...(p.categoryId ? { categoryId: p.categoryId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: true }
    });
    return NextResponse.json({ product: productDto(p), related: related.map((r) => productDto(r)) });
  } catch {
    return fail("تعذر تحميل المنتج", 500);
  }
}
