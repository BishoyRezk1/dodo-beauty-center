import { NextResponse } from "next/server";
import type { ShopCategory, ShopProduct } from "@prisma/client";

export const num = (v: unknown): number => Number(v ?? 0);
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const isUnique = (e: unknown) => (e as { code?: string } | null)?.code === "P2002";

function sanitize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function slugFrom(name: string, provided?: string | null): string {
  const given = provided ? sanitize(provided) : "";
  if (given) return given;
  return `${sanitize(name) || "item"}-${Math.random().toString(36).slice(2, 6)}`;
}

type WithCat = ShopProduct & { category?: ShopCategory | null };

export function productDto(p: WithCat, admin = false) {
  const price = num(p.price);
  const compare = p.comparePrice != null ? num(p.comparePrice) : null;
  const discountPercent = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    imageUrl: p.imageUrl,
    images: p.images,
    price,
    comparePrice: compare,
    discountPercent,
    stock: p.stock,
    inStock: p.stock > 0,
    lowStock: p.stock > 0 && p.stock <= p.lowStockAt,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    createdAt: p.createdAt,
    ...(admin ? { isActive: p.isActive, isArchived: p.isArchived, lowStockAt: p.lowStockAt } : {})
  };
}
