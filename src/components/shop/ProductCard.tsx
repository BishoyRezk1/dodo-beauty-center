import Link from "next/link";
import type { ShopProductView } from "@/lib/shop/types";
import { money } from "@/lib/shop/format";
import QuickAdd from "./QuickAdd";

export default function ProductCard({ product, open = true }: { product: ShopProductView; open?: boolean }) {
  const p = product;
  const to = `/shop/${encodeURIComponent(p.slug)}`;
  const hasOld = !!p.comparePrice && p.comparePrice > p.price;
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rosegold/20 bg-white shadow-soft">
      <div className="relative">
        <Link href={to} className="block aspect-square bg-white p-2" aria-label={p.name}>
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-cream text-4xl">💗</div>
          )}
        </Link>
        {p.discountPercent > 0 && (
          <span className="absolute right-2 top-2 rounded-md bg-wine px-1.5 py-0.5 text-[11px] font-bold text-cream">
            -{p.discountPercent}%
          </span>
        )}
        <div className="absolute bottom-2 left-2">
          <QuickAdd product={p} open={open} />
        </div>
        {!p.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/70 py-1 text-center text-xs font-bold text-cream">
            نفدت الكمية
          </span>
        )}
      </div>
      <Link href={to} className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-5 text-charcoal">{p.name}</span>
        <span className="text-base font-extrabold text-wine">{money(p.price)}</span>
        {hasOld && (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-charcoal/50 line-through">{money(p.comparePrice as number)}</span>
            <span className="font-bold text-emerald-600">وفّري {p.discountPercent}%</span>
          </span>
        )}
        {p.inStock && p.lowStock && <span className="text-xs font-semibold text-amber-600">باقي {p.stock} فقط</span>}
      </Link>
    </div>
  );
}
