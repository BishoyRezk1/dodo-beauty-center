import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, productDto } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim().slice(0, 80);
    const category = sp.get("category");
    const sort = sp.get("sort") || "new";
    const filter = sp.get("filter");
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const take = Math.min(48, Math.max(1, Number(sp.get("limit")) || 24));

    const and: Prisma.ShopProductWhereInput[] = [{ isActive: true, isArchived: false }];
    if (category) {
      and.push({ category: { is: { slug: category, isActive: true } } });
    } else {
      and.push({ OR: [{ categoryId: null }, { category: { is: { isActive: true } } }] });
    }
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } }
        ]
      });
    }
    if (filter === "sale") and.push({ comparePrice: { not: null } });
    if (filter === "new") and.push({ createdAt: { gte: new Date(Date.now() - 30 * 86400000) } });
    if (filter === "instock") and.push({ stock: { gt: 0 } });
    const where: Prisma.ShopProductWhereInput = { AND: and };

    const orderBy: Prisma.ShopProductOrderByWithRelationInput =
      sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };

    const [total, rows] = await Promise.all([
      prisma.shopProduct.count({ where }),
      prisma.shopProduct.findMany({ where, orderBy, skip: (page - 1) * take, take, include: { category: true } })
    ]);
    return NextResponse.json({
      items: rows.map((p) => productDto(p)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / take))
    });
  } catch {
    return fail("تعذر تحميل المنتجات", 500);
  }
}
