"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "@/lib/shop/cart";
import type { ShopProductView } from "@/lib/shop/types";

export default function ProductBuy({ product, open }: { product: ShopProductView; open: boolean }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [note, setNote] = useState("");
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
      qty
    );
    setAdded(r.ok);
    setNote(r.capped ? "أُضيف الحد الأقصى المتاح من الكمية" : "");
  }

  if (!product.inStock) {
    return <p className="rounded-xl bg-charcoal/10 p-3 text-center font-bold text-charcoal">نفدت الكمية حاليًا</p>;
  }
  if (!open) {
    return <p className="rounded-xl bg-charcoal/10 p-3 text-center font-bold text-charcoal">المتجر مغلق مؤقتًا</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-charcoal">الكمية</span>
        <div className="flex items-center rounded-xl border border-rosegold/40">
          <button type="button" aria-label="تقليل" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 text-xl text-wine">
            −
          </button>
          <span className="w-10 text-center font-bold">{qty}</span>
          <button type="button" aria-label="زيادة" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="h-11 w-11 text-xl text-wine">
            +
          </button>
        </div>
        <span className="text-xs text-charcoal/60">المتاح: {product.stock}</span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="min-h-[48px] w-full rounded-xl bg-wine px-4 font-bold text-cream disabled:opacity-50"
      >
        أضيفي إلى السلة
      </button>
      {added && (
        <div className="rounded-xl bg-cream p-3 text-center text-sm">
          <span className="font-bold text-wine">تمت الإضافة ✓</span>
          {note && <span className="block text-charcoal/70">{note}</span>}
          <Link href="/cart" className="mt-1 block font-bold text-wine underline">
            الذهاب إلى السلة
          </Link>
        </div>
      )}
    </div>
  );
}
