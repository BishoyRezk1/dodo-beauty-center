"use client";

import { useState } from "react";
import { addToCart } from "@/lib/shop/cart";
import type { ShopProductView } from "@/lib/shop/types";

export default function AddToCartButton({ product, open = true }: { product: ShopProductView; open?: boolean }) {
  const [msg, setMsg] = useState("");
  const disabled = !open || !product.inStock;

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
    setMsg(r.capped ? "وصلتي للحد الأقصى المتاح" : "تمت الإضافة ✓");
    setTimeout(() => setMsg(""), 1800);
  }

  const label = !product.inStock ? "غير متوفر" : !open ? "المتجر مغلق" : msg || "أضيفي للسلة";
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="min-h-[44px] w-full rounded-xl bg-wine px-3 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
