import Link from "next/link";
import type { ShopProductView } from "@/lib/shop/types";
import ProductCard from "./ProductCard";

export default function ProductRow({
  title,
  items,
  open = true,
  moreHref
}: {
  title: string;
  items: ShopProductView[];
  open?: boolean;
  moreHref?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-wine" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        {moreHref && (
          <Link href={moreHref} className="text-sm font-bold text-wine underline">
            عرض الكل
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start md:w-48">
            <ProductCard product={p} open={open} />
          </div>
        ))}
      </div>
    </section>
  );
}
