"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ShopHeader from "@/components/shop/ShopHeader";
import { cartTotals, getCart, removeItem, setQty, syncCart, useCart, type CartItem } from "@/lib/shop/cart";
import { money } from "@/lib/shop/format";

type Settings = { open: boolean; deliveryFee: number; freeDeliveryOver: number; minOrder: number; deliveryPolicy: string };

export default function CartPage() {
  const items = useCart();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<"checking" | "ok" | "offline">("checking");
  const [notice, setNotice] = useState("");

  const verify = useCallback(async () => {
    const list: CartItem[] = getCart();
    setStatus("checking");
    try {
      const sRes = await fetch("/api/shop/settings", { cache: "no-store" });
      if (!sRes.ok) throw new Error("settings");
      setSettings(await sRes.json());
      if (list.length > 0) {
        const vRes = await fetch("/api/shop/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: list.map((i) => ({ productId: i.productId, qty: i.qty })) }),
          cache: "no-store"
        });
        if (!vRes.ok) throw new Error("verify");
        const data = await vRes.json();
        const r = syncCart(data.items);
        if (r.removed.length > 0) setNotice(`تم حذف (${r.removed.join("، ")}) لأنه لم يعد متاحًا.`);
        else if (r.changed) setNotice("تم تحديث الأسعار والكميات حسب المتاح حاليًا.");
        else setNotice("");
      }
      setStatus("ok");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  const t = cartTotals(items, settings);
  const hasUnavailable = items.some((i) => i.max <= 0);
  const belowMin = !!settings && settings.minOrder > 0 && t.subtotal < settings.minOrder;
  const canCheckout = items.length > 0 && status === "ok" && !!settings?.open && !hasUnavailable && !belowMin;

  return (
    <div dir="rtl" className="min-h-screen pb-28">
      <ShopHeader title="عربة التسوق" backHref="/shop" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        {status === "offline" && (
          <div className="mb-3 rounded-xl bg-charcoal/10 p-3 text-sm font-semibold text-charcoal">
            تعذر التحقق من الأسعار والمخزون، الأرقام المعروضة غير مؤكدة.{" "}
            <button type="button" onClick={verify} className="font-bold text-wine underline">
              إعادة المحاولة
            </button>
          </div>
        )}
        {notice && <div className="mb-3 rounded-xl bg-cream p-3 text-sm font-semibold text-wine">{notice}</div>}
        {settings && !settings.open && (
          <div className="mb-3 rounded-xl bg-charcoal/10 p-3 text-center font-bold text-charcoal">المتجر مغلق مؤقتًا</div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl bg-cream p-8 text-center">
            <p className="mb-4 text-charcoal">عربة التسوق فاضية</p>
            <Link href="/shop" className="inline-block rounded-xl bg-wine px-6 py-3 font-bold text-cream">
              تصفحي المنتجات
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.productId} className="flex gap-3 rounded-2xl border border-rosegold/25 bg-white p-3 shadow-soft">
                  <Link href={`/shop/${encodeURIComponent(i.slug)}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl">💗</span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-sm font-bold text-charcoal">{i.name}</span>
                    <span className="text-sm font-bold text-wine">{money(i.price)}</span>
                    {i.max <= 0 ? (
                      <span className="text-xs font-bold text-wine">نفدت الكمية، احذفيه للمتابعة</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-rosegold/40">
                          <button type="button" aria-label="تقليل" onClick={() => setQty(i.productId, i.qty - 1)} className="h-9 w-9 text-lg text-wine">
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                          <button
                            type="button"
                            aria-label="زيادة"
                            disabled={i.qty >= i.max}
                            onClick={() => setQty(i.productId, i.qty + 1)}
                            className="h-9 w-9 text-lg text-wine disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                        {i.qty >= i.max && <span className="text-xs text-charcoal/60">الحد الأقصى</span>}
                      </div>
                    )}
                  </div>
                  <button type="button" aria-label="حذف" onClick={() => removeItem(i.productId)} className="self-start p-1 text-xl text-charcoal/50">
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 rounded-2xl border border-rosegold/25 bg-white p-4 shadow-soft">
              <div className="flex justify-between text-sm">
                <span>إجمالي المنتجات ({t.count})</span>
                <span className="font-bold">{money(t.subtotal)}</span>
              </div>
              {t.savings > 0 && (
                <div className="flex justify-between text-sm text-wine">
                  <span>وفّرتي</span>
                  <span className="font-bold">{money(t.savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>التوصيل</span>
                <span className="font-bold">يُحدد عبر التواصل</span>
              </div>
              <div className="flex justify-between border-t border-rosegold/25 pt-2 text-lg">
                <span className="font-bold">الإجمالي (بدون التوصيل)</span>
                <span className="font-bold text-wine">{money(t.total)}</span>
              </div>
              {settings && settings.freeDeliveryOver > 0 && t.delivery !== 0 && (
                <p className="text-xs text-charcoal/60">التوصيل مجاني للطلبات من {money(settings.freeDeliveryOver)}</p>
              )}
              {belowMin && settings && <p className="text-sm font-bold text-wine">الحد الأدنى للطلب {money(settings.minOrder)}</p>}
              {settings?.deliveryPolicy && <p className="text-xs text-charcoal/60">{settings.deliveryPolicy}</p>}
            </div>

            <div className="mt-4">
              {canCheckout ? (
                <Link href="/checkout" className="block min-h-[48px] rounded-xl bg-wine py-3 text-center font-bold text-cream">
                  إتمام الطلب
                </Link>
              ) : (
                <span className="block min-h-[48px] cursor-not-allowed rounded-xl bg-wine/40 py-3 text-center font-bold text-cream">
                  {status === "checking" ? "جاري التحقق..." : "إتمام الطلب"}
                </span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
