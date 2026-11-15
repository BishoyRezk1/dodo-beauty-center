import Link from "next/link";
import type { ShopProductView } from "@/lib/shop/types";
import { money } from "@/lib/shop/format";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ product, open = true }: { product: ShopProductView; open?: boolean }) {
  const p = product;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-rosegold/25 bg-white shadow-soft">
      <Link href={`/shop/${encodeURIComponent(p.slug)}`} className="relative block aspect-square bg-cream">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">💗</div>
        )}
        {p.discountPercent > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-wine px-2 py-0.5 text-xs font-bold text-cream">
            -{p.discountPercent}%
          </span>
        )}
        {!p.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/70 py-1 text-center text-xs font-bold text-cream">
            نفدت الكمية
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/shop/${encodeURIComponent(p.slug)}`} className="line-clamp-2 text-sm font-bold text-charcoal">
          {p.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-wine">{money(p.price)}</span>
          {p.comparePrice && p.comparePrice > p.price && (
            <span className="text-xs text-charcoal/50 line-through">{money(p.comparePrice)}</span>
          )}
        </div>
        {p.lowStock && <span className="text-xs font-semibold text-rosegold">آخر قطع متاحة</span>}
        <div className="mt-auto pt-2">
          <AddToCartButton product={p} open={open} />
        </div>
      </div>
    </div>
  );
}
