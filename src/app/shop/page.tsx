import Link from "next/link";
import type { ReactNode } from "react";
import ShopHeader from "@/components/shop/ShopHeader";
import ProductCard from "@/components/shop/ProductCard";
import { listShopCategories, listShopProducts, safe } from "@/lib/shop/queries";
import { getShopSettings } from "@/lib/shop/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "DoDo Beauty Shop | Zina Nails" };

type SP = { q?: string; category?: string; sort?: string; filter?: string; page?: string };

function href(sp: SP, patch: Partial<SP>) {
  const m: Record<string, string | undefined> = { ...sp, page: undefined, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/shop?${s}` : "/shop";
}

function Chip({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={to}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
        active ? "border-wine bg-wine text-cream" : "border-rosegold/40 bg-white text-charcoal"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = searchParams || {};
  const [settings, categories, result] = await Promise.all([
    safe(getShopSettings),
    safe(listShopCategories),
    safe(() =>
      listShopProducts({
        q: sp.q,
        category: sp.category,
        sort: sp.sort,
        filter: sp.filter,
        page: Number(sp.page) || 1
      })
    )
  ]);
  const open = settings ? settings.open : true;

  return (
    <div dir="rtl" className="min-h-screen pb-24">
      <ShopHeader />
      <main className="mx-auto max-w-5xl px-4 py-4">
        {!open && (
          <div className="mb-4 rounded-xl bg-charcoal/10 p-3 text-center font-bold text-charcoal">
            المتجر مغلق مؤقتًا، تقدري تتصفحي المنتجات وهنفتح قريب 💗
          </div>
        )}

        <form action="/shop" method="get" className="mb-3 flex gap-2">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="ابحثي عن منتج..."
            className="h-12 flex-1 rounded-xl border border-rosegold/40 bg-white px-4"
          />
          <button type="submit" className="h-12 rounded-xl bg-wine px-5 font-bold text-cream">
            بحث
          </button>
        </form>

        {categories && categories.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <Chip to={href(sp, { category: undefined })} active={!sp.category}>
              الكل
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} to={href(sp, { category: c.slug })} active={sp.category === c.slug}>
                {c.name}
              </Chip>
            ))}
          </div>
        )}

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Chip to={href(sp, { filter: undefined })} active={!sp.filter}>
            كل المنتجات
          </Chip>
          <Chip to={href(sp, { filter: "new" })} active={sp.filter === "new"}>
            جديد
          </Chip>
          <Chip to={href(sp, { filter: "sale" })} active={sp.filter === "sale"}>
            مخفّض
          </Chip>
          <Chip to={href(sp, { filter: "instock" })} active={sp.filter === "instock"}>
            متوفر
          </Chip>
          <Chip to={href(sp, { sort: "price_asc" })} active={sp.sort === "price_asc"}>
            الأقل سعرًا
          </Chip>
          <Chip to={href(sp, { sort: "price_desc" })} active={sp.sort === "price_desc"}>
            الأعلى سعرًا
          </Chip>
        </div>

        {!result ? (
          <p className="rounded-xl bg-cream p-6 text-center text-charcoal">تعذر تحميل المنتجات الآن، جرّبي بعد قليل.</p>
        ) : result.items.length === 0 ? (
          <p className="rounded-xl bg-cream p-6 text-center text-charcoal">لا توجد منتجات مطابقة حاليًا.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
      </main>
    </div>
  );
}
