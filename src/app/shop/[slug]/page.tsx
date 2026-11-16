import Link from "next/link";
import { notFound } from "next/navigation";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductBuy from "@/components/shop/ProductBuy";
import ProductRow from "@/components/shop/ProductRow";
import StickyBuyBar from "@/components/shop/StickyBuyBar";
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
  const hasOld = !!p.comparePrice && p.comparePrice > p.price;
  const savings = hasOld ? (p.comparePrice as number) - p.price : 0;

  return (
    <div dir="rtl" className="min-h-screen pb-44 md:pb-24">
      <ShopHeader backHref="/shop" />
      <main className="mx-auto max-w-6xl px-4 py-4">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-charcoal/60">
          <Link href="/shop" className="font-bold text-wine">
            المتجر
          </Link>
          {p.categoryName && p.categorySlug && (
            <>
              <span>/</span>
              <Link href={`/shop?category=${encodeURIComponent(p.categorySlug)}`} className="font-bold text-wine">
                {p.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="line-clamp-1">{p.name}</span>
        </nav>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:sticky md:top-20 md:self-start">
            <ProductGallery images={images} name={p.name} />
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold leading-8 text-charcoal md:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                {p.name}
              </h1>
              {p.sku && <p className="mt-1 text-xs text-charcoal/50">كود المنتج: {p.sku}</p>}
            </div>

            <div className="rounded-2xl bg-cream p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-extrabold text-wine">{money(p.price)}</span>
                {hasOld && (
                  <>
                    <span className="text-charcoal/50 line-through">{money(p.comparePrice as number)}</span>
                    <span className="rounded-md bg-wine px-2 py-0.5 text-xs font-bold text-cream">-{p.discountPercent}%</span>
                  </>
                )}
              </div>
              {hasOld && <p className="mt-1 text-sm font-bold text-emerald-600">وفّري {money(savings)}</p>}
            </div>

            <p className="flex items-center gap-2 text-sm font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${!p.inStock ? "bg-red-500" : p.lowStock ? "bg-amber-500" : "bg-emerald-500"}`} />
              {!p.inStock ? "نفدت الكمية" : p.lowStock ? `باقي ${p.stock} قطع فقط` : "متوفر"}
            </p>

            <ProductBuy product={p} open={open} />

            <ul className="space-y-2 rounded-2xl border border-rosegold/20 bg-white p-4 text-sm text-charcoal/80">
              <li>💵 الدفع عند الاستلام أو فودافون كاش</li>
              <li>🚚 التوصيل يُحدد عبر التواصل بعد تأكيد الطلب</li>
              <li>💬 تأكيد الطلب عبر واتساب</li>
            </ul>
          </div>
        </div>

        {p.description && (
          <section className="mt-8 rounded-2xl border border-rosegold/20 bg-white p-5">
            <h2 className="mb-2 text-lg font-bold text-wine">وصف المنتج</h2>
            <p className="whitespace-pre-line leading-8 text-charcoal/80">{p.description}</p>
          </section>
        )}

        <div className="mt-8">
          <ProductRow title="منتجات مشابهة" items={data.related} open={open} />
        </div>
      </main>
      <StickyBuyBar product={p} open={open} />
    </div>
  );
}
