import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { productSchema } from "@/lib/shop/schemas";
import { fail, isUnique, productDto, slugFrom } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const where: Prisma.ShopProductWhereInput = {
    ...(sp.get("archived") === "1" ? { isArchived: true } : { isArchived: false }),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {})
  };
  const rows = await prisma.shopProduct.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { category: true }
  });
  return NextResponse.json({ items: rows.map((p) => productDto(p, true)) });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  const d = parsed.data;
  if (d.categoryId) {
    const cat = await prisma.shopCategory.findUnique({ where: { id: d.categoryId } });
    if (!cat) return fail("التصنيف غير موجود");
  }
  try {
    const p = await prisma.shopProduct.create({
      data: {
        name: d.name,
        slug: slugFrom(d.name, d.slug),
        sku: d.sku || null,
        description: d.description ?? null,
        imageUrl: d.imageUrl ?? null,
        images: d.images ?? [],
        price: d.price,
        comparePrice: d.comparePrice ?? null,
        stock: d.stock ?? 0,
        lowStockAt: d.lowStockAt ?? 3,
        categoryId: d.categoryId ?? null,
        isActive: d.isActive ?? true
      },
      include: { category: true }
    });
    return NextResponse.json({ product: productDto(p, true) }, { status: 201 });
  } catch (e) {
    if (isUnique(e)) return fail("كود SKU أو الرابط مستخدم قبل كده", 409);
    return fail("تعذر حفظ المنتج", 500);
  }
}
