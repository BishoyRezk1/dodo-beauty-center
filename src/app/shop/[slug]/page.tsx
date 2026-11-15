import { notFound } from "next/navigation";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductCard from "@/components/shop/ProductCard";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductBuy from "@/components/shop/ProductBuy";
import { getShopProduct, safe } from "@/lib/shop/queries";
import { getShopSettings } from "@/lib/shop/settings";
import { money } from "@/lib/shop/format";

export const dynamic = "force-dynamic";

function decode(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await safe(() => getShopProduct(decode(params.slug)));
  return { title: data?.product ? `${data.product.name} | DoDo Beauty Shop` : "DoDo Beauty Shop" };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [data, settings] = await Promise.all([safe(() => getShopProduct(decode(params.slug))), safe(getShopSettings)]);
  const open = settings ? settings.open : true;

  if (data && !data.product) notFound();

  if (!data || !data.product) {
    return (
      <div dir="rtl" className="min-h-screen">
        <ShopHeader backHref="/shop" />
        <p className="m-6 rounded-xl bg-cream p-6 text-center">تعذر تحميل المنتج الآن، جرّبي بعد قليل.</p>
      </div>
    );
  }

  const p = data.product;
  const images = Array.from(new Set([p.imageUrl, ...p.images].filter((x): x is string => !!x)));

  return (
    <div dir="rtl" className="min-h-screen pb-24">
      <ShopHeader backHref="/shop" />
      <main className="mx-auto max-w-5xl px-4 py-4">
        <div className="grid gap-6 md:grid-cols-2">
          <ProductGallery images={images} name={p.name} />
          <div className="space-y-3">
            {p.categoryName && <span className="text-sm font-semibold text-rosegold">{p.categoryName}</span>}
            <h1 className="text-2xl font-bold text-charcoal" style={{ fontFamily: "var(--font-display)" }}>
              {p.name}
            </h1>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-wine">{money(p.price)}</span>
              {p.comparePrice && p.comparePrice > p.price && (
                <>
                  <span className="text-charcoal/50 line-through">{money(p.comparePrice)}</span>
                  <span className="rounded-full bg-wine px-2 py-0.5 text-xs font-bold text-cream">وفّري {p.discountPercent}%</span>
                </>
              )}
            </div>
            <p className={`text-sm font-semibold ${p.inStock ? "text-charcoal/70" : "text-wine"}`}>
              {!p.inStock ? "نفدت الكمية" : p.lowStock ? "آخر قطع متاحة" : "متوفر"}
              {p.sku ? ` · كود: ${p.sku}` : ""}
            </p>
            {p.description && <p className="whitespace-pre-line leading-8 text-charcoal/80">{p.description}</p>}
            <ProductBuy product={p} open={open} />
          </div>
        </div>

        {data.related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-bold text-wine">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {data.related.map((r) => (
                <ProductCard key={r.id} product={r} open={open} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
