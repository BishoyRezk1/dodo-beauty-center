import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productDto } from "@/lib/shop/utils";
import type { ShopProductView } from "@/lib/shop/types";

export async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function toView(p: ReturnType<typeof productDto>): ShopProductView {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl,
    price: p.price,
    comparePrice: p.comparePrice,
    discountPercent: p.discountPercent,
    stock: p.stock,
    inStock: p.inStock,
    lowStock: p.lowStock
  };
}

export async function listShopCategories() {
  const rows = await prisma.shopCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl }));
}

export type ListOpts = {
  q?: string;
  category?: string;
  sort?: string;
  filter?: string;
  page?: number;
  min?: number;
  max?: number;
  take?: number;
};

export async function listShopProducts(o: ListOpts) {
  const take = Math.min(48, Math.max(1, o.take || 24));
  const page = Math.max(1, o.page || 1);
  const and: Prisma.ShopProductWhereInput[] = [{ isActive: true, isArchived: false }];
  if (o.category) {
    and.push({ category: { is: { slug: o.category, isActive: true } } });
  } else {
    and.push({ OR: [{ categoryId: null }, { category: { is: { isActive: true } } }] });
  }
  const q = (o.q || "").trim().slice(0, 80);
  if (q) {
    and.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] });
  }
  if (o.filter === "sale") and.push({ comparePrice: { not: null } });
  if (o.filter === "new") and.push({ createdAt: { gte: new Date(Date.now() - 30 * 86400000) } });
  if (o.filter === "instock") and.push({ stock: { gt: 0 } });
  const priceCond: Prisma.DecimalFilter = {};
  if (o.min && o.min > 0) priceCond.gte = o.min;
  if (o.max && o.max > 0) priceCond.lte = o.max;
  if (Object.keys(priceCond).length > 0) and.push({ price: priceCond });
  const where: Prisma.ShopProductWhereInput = { AND: and };
  const orderBy: Prisma.ShopProductOrderByWithRelationInput =
    o.sort === "price_asc" ? { price: "asc" } : o.sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };
  const [total, rows] = await Promise.all([
    prisma.shopProduct.count({ where }),
    prisma.shopProduct.findMany({ where, orderBy, skip: (page - 1) * take, take, include: { category: true } })
  ]);
  return { items: rows.map((p) => toView(productDto(p))), total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

export async function getShopProduct(slug: string) {
  const p = await prisma.shopProduct.findFirst({
    where: { slug, isActive: true, isArchived: false },
    include: { category: true }
  });
  if (!p) return { product: null, related: [] as ShopProductView[] };
  const related = await prisma.shopProduct.findMany({
    where: {
      isActive: true,
      isArchived: false,
      id: { not: p.id },
      ...(p.categoryId ? { categoryId: p.categoryId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { category: true }
  });
  const dto = productDto(p);
  return {
    product: {
      ...toView(dto),
      description: p.description,
      images: p.images,
      sku: p.sku,
      categoryName: p.category?.name ?? null,
      categorySlug: p.category?.slug ?? null
    },
    related: related.map((r) => toView(productDto(r)))
  };
}
