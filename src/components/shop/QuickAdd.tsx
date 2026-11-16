"use client";

import { useState } from "react";
import { addToCart } from "@/lib/shop/cart";
import type { ShopProductView } from "@/lib/shop/types";

export default function QuickAdd({ product, open = true }: { product: ShopProductView; open?: boolean }) {
  const [done, setDone] = useState(false);
  const [capped, setCapped] = useState(false);
  if (!open || !product.inStock) return null;

  function onAdd() {
    const r = addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        comparePrice: product.comparePrice,
        max: product.stock
      },
      1
    );
    setCapped(r.capped);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={done ? (capped ? "وصلتي للحد الأقصى المتاح" : "تمت الإضافة") : "أضيفي للسلة"}
      title={capped && done ? "وصلتي للحد الأقصى المتاح" : undefined}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-wine text-2xl font-bold leading-none text-cream shadow-soft active:scale-95"
    >
      {done ? "✓" : "+"}
    </button>
  );
}
