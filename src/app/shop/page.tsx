import Link from "next/link";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductCard from "@/components/shop/ProductCard";
import ProductRow from "@/components/shop/ProductRow";
import { listShopCategories, listShopProducts, safe } from "@/lib/shop/queries";
import { getShopSettings } from "@/lib/shop/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "DoDo Beauty Shop | Zina Nails" };

type SP = { q?: string; category?: string; sort?: string; filter?: string; page?: string; min?: string; max?: string };

const ICONS: Record<string, string> = {
  skincare: "🧴",
  haircare: "💇‍♀️",
  nails: "💅",
  makeup: "💄",
  bodycare: "🧼",
  tools: "🪮",
  offers: "🏷️"
};
const FILTER_LABEL: Record<string, string> = { sale: "مخفّض", new: "جديد", instock: "متوفر" };
const SORT_LABEL: Record<string, string> = { price_asc: "الأقل سعرًا", price_desc: "الأعلى سعرًا" };

function href(sp: SP, patch: Partial<SP>) {
  const m: Record<string, string | undefined> = { ...sp, page: undefined, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/shop?${s}` : "/shop";
}

function num(v?: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = searchParams || {};
  const page = Math.max(1, Number(sp.page) || 1);
  const browse = !sp.q && !sp.category && !sp.filter && !sp.sort && !sp.min && !sp.max;
  const home = browse && page === 1;

  const [settings, categories, result, deals, fresh] = await Promise.all([
    safe(getShopSettings),
    safe(listShopCategories),
    safe(() =>
      listShopProducts({ q: sp.q, category: sp.category, sort: sp.sort, filter: sp.filter, page, min: num(sp.min), max: num(sp.max) })
    ),
    home ? safe(() => listShopProducts({ filter: "sale", take: 10 })) : Promise.resolve(null),
    home ? safe(() => listShopProducts({ filter: "new", take: 10 })) : Promise.resolve(null)
  ]);
  const open = settings ? settings.open : true;
  const catName = categories?.find((c) => c.slug === sp.category)?.name;

  const active: { label: string; to: string }[] = [];
  if (sp.q) active.push({ label: `بحث: ${sp.q}`, to: href(sp, { q: undefined }) });
  if (sp.filter && FILTER_LABEL[sp.filter]) active.push({ label: FILTER_LABEL[sp.filter], to: href(sp, { filter: undefined }) });
  if (sp.sort && SORT_LABEL[sp.sort]) active.push({ label: SORT_LABEL[sp.sort], to: href(sp, { sort: undefined }) });
  if (sp.min) active.push({ label: `من ${sp.min} جنيه`, to: href(sp, { min: undefined }) });
  if (sp.max) active.push({ label: `إلى ${sp.max} جنيه`, to: href(sp, { max: undefined }) });

  const title = sp.q ? `نتائج البحث عن «${sp.q}»` : catName || "كل المنتجات";
  const filtersOpen = !!(sp.sort || sp.filter || sp.min || sp.max);
  const field = "h-11 w-full rounded-xl border border-rosegold/40 bg-white px-3 text-sm";

  return (
    <div dir="rtl" className="min-h-screen pb-24">
      <ShopHeader />
      <main className="mx-auto max-w-6xl px-4 py-4">
        {!open && (
          <div className="mb-4 rounded-xl bg-charcoal/10 p-3 text-center font-bold text-charcoal">
            المتجر مغلق مؤقتًا، تقدري تتصفحي المنتجات وهنفتح قريب 💗
          </div>
        )}

        <form action="/shop" method="get" className="mb-4 flex overflow-hidden rounded-full border-2 border-wine bg-white">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
          {sp.min && <input type="hidden" name="min" value={sp.min} />}
          {sp.max && <input type="hidden" name="max" value={sp.max} />}
          <input name="q" defaultValue={sp.q || ""} placeholder="ابحثي عن منتج أو كود..." className="h-12 min-w-0 flex-1 bg-transparent px-5 outline-none" />
          <button type="submit" aria-label="بحث" className="bg-wine px-6 font-bold text-cream">
            بحث
          </button>
        </form>

        {categories && categories.length > 0 && (
          <div className="mb-5 flex gap-4 overflow-x-auto pb-2">
            <Link href={href(sp, { category: undefined })} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-cream text-2xl ${!sp.category ? "ring-2 ring-wine" : "border border-rosegold/30"}`}>
                ✨
              </span>
              <span className={`text-center text-[11px] font-bold ${!sp.category ? "text-wine" : "text-charcoal/70"}`}>الكل</span>
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={href(sp, { category: c.slug })} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <span
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-cream text-2xl ${
                    sp.category === c.slug ? "ring-2 ring-wine" : "border border-rosegold/30"
                  }`}
                >
                  {c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : ICONS[c.slug] || "💗"}
                </span>
                <span className={`line-clamp-2 text-center text-[11px] font-bold leading-4 ${sp.category === c.slug ? "text-wine" : "text-charcoal/70"}`}>
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {home && (
          <>
            <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-l from-wine to-rosegold p-6 text-cream shadow-soft">
              <p className="text-xs font-bold opacity-90">Zina Nails</p>
              <h1 className="mt-1 text-2xl font-extrabold md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                DoDo Beauty Shop 💗
              </h1>
              <p className="mt-1 text-sm opacity-95">منتجات العناية بالبشرة والشعر والأظافر والمكياج في مكان واحد</p>
              <a href="#all" className="mt-4 inline-block rounded-full bg-cream px-5 py-2 text-sm font-bold text-wine">
                تسوقي الآن
              </a>
            </div>
            <div className="mb-6 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-charcoal/80 md:text-xs">
              <div className="rounded-xl border border-rosegold/20 bg-white p-2">💵 الدفع عند الاستلام</div>
              <div className="rounded-xl border border-rosegold/20 bg-white p-2">📱 فودافون كاش</div>
              <div className="rounded-xl border border-rosegold/20 bg-white p-2">💬 تأكيد الطلب عبر واتساب</div>
            </div>
            <ProductRow title="عروض مخفّضة 🏷️" items={deals?.items || []} open={open} moreHref={href({}, { filter: "sale" })} />
            <ProductRow title="وصل حديثًا ✨" items={fresh?.items || []} open={open} moreHref={href({}, { filter: "new" })} />
          </>
        )}

        <section id="all">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-wine" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h2>
            {result && <span className="text-sm text-charcoal/60">{result.total} منتج</span>}
          </div>

          <details open={filtersOpen} className="mb-3 rounded-xl border border-rosegold/25 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-wine">تصفية وترتيب</summary>
            <form action="/shop" method="get" className="grid grid-cols-2 gap-3 border-t border-rosegold/20 p-4 md:grid-cols-4">
              {sp.q && <input type="hidden" name="q" value={sp.q} />}
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <label className="text-xs font-bold">
                الترتيب
                <select name="sort" defaultValue={sp.sort || ""} className={`${field} mt-1`}>
                  <option value="">الأحدث</option>
                  <option value="price_asc">الأقل سعرًا</option>
                  <option value="price_desc">الأعلى سعرًا</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                العرض
                <select name="filter" defaultValue={sp.filter || ""} className={`${field} mt-1`}>
                  <option value="">كل المنتجات</option>
                  <option value="new">جديد</option>
                  <option value="sale">مخفّض</option>
                  <option value="instock">متوفر</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                السعر من
                <input name="min" type="number" min={0} inputMode="numeric" defaultValue={sp.min || ""} className={`${field} mt-1`} />
              </label>
              <label className="text-xs font-bold">
                السعر إلى
                <input name="max" type="number" min={0} inputMode="numeric" defaultValue={sp.max || ""} className={`${field} mt-1`} />
              </label>
              <button type="submit" className="col-span-2 min-h-[44px] rounded-xl bg-wine font-bold text-cream md:col-span-4">
                تطبيق
              </button>
            </form>
          </details>

          {active.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <Link key={a.label} href={a.to} className="flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-bold text-wine">
                  {a.label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href="/shop" className="text-xs font-bold text-charcoal/60 underline">
                مسح الكل
              </Link>
            </div>
          )}

          {!result ? (
            <p className="rounded-xl bg-cream p-6 text-center text-charcoal">تعذر تحميل المنتجات الآن، جرّبي بعد قليل.</p>
          ) : result.items.length === 0 ? (
            <p className="rounded-xl bg-cream p-6 text-center text-charcoal">لا توجد منتجات مطابقة حاليًا.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {result.items.map((p) => (
                  <ProductCard key={p.id} product={p} open={open} />
                ))}
              </div>
              {result.pages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  {result.page > 1 && (
                    <Link href={href(sp, { page: String(result.page - 1) })} className="rounded-xl border border-wine px-4 py-2 font-bold text-wine">
                      السابق
                    </Link>
                  )}
                  <span className="text-sm text-charcoal/70">
                    {result.page} / {result.pages}
                  </span>
                  {result.page < result.pages && (
                    <Link href={href(sp, { page: String(result.page + 1) })} className="rounded-xl border border-wine px-4 py-2 font-bold text-wine">
                      التالي
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
