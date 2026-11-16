"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "@/lib/shop/cart";
import { money } from "@/lib/shop/format";
import type { ShopProductView } from "@/lib/shop/types";

export default function StickyBuyBar({ product, open }: { product: ShopProductView; open: boolean }) {
  const [done, setDone] = useState(false);
  if (!open || !product.inStock) return null;

  function onAdd() {
    addToCart(
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
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }

  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-rosegold/25 bg-white/95 backdrop-blur-md md:hidden"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
        <div className="flex-1">
          <div className="text-lg font-extrabold text-wine">{money(product.price)}</div>
          {product.comparePrice && product.comparePrice > product.price && (
            <div className="text-xs text-charcoal/50 line-through">{money(product.comparePrice)}</div>
          )}
        </div>
        {done && (
          <Link href="/cart" className="text-sm font-bold text-wine underline">
            السلة
          </Link>
        )}
        <button type="button" onClick={onAdd} className="min-h-[44px] rounded-xl bg-wine px-6 font-bold text-cream">
          {done ? "تمت الإضافة ✓" : "أضيفي للسلة"}
        </button>
      </div>
    </div>
  );
}
