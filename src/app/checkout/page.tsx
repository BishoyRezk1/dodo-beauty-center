"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ShopHeader from "@/components/shop/ShopHeader";
import { cartTotals, clearCart, getCart, syncCart, useCart } from "@/lib/shop/cart";
import { money } from "@/lib/shop/format";
import { GOVERNORATES } from "@/lib/shop/constants";

type Settings = {
  open: boolean;
  deliveryFee: number;
  freeDeliveryOver: number;
  minOrder: number;
  deliveryPolicy: string;
  vodafoneNumber: string;
  paymentInstructions: string;
};

type Form = {
  customerName: string;
  phone: string;
  whatsapp: string;
  sameWa: boolean;
  governorate: string;
  city: string;
  address: string;
  notes: string;
  paymentMethod: "COD" | "VODAFONE_CASH";
  transferRef: string;
};

const KEY_STORE = "dodo_checkout_key";
const input = "h-12 w-full rounded-xl border border-rosegold/40 bg-white px-4";

function newKey(): string {
  try {
    let k = window.sessionStorage.getItem(KEY_STORE);
    if (!k) {
      const raw = window.crypto && "randomUUID" in window.crypto ? window.crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      k = raw.replace(/[^A-Za-z0-9_-]/g, "");
      window.sessionStorage.setItem(KEY_STORE, k);
    }
    return k;
  } catch {
    return `k${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<"checking" | "ok" | "offline">("checking");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Form>({
    customerName: "",
    phone: "",
    whatsapp: "",
    sameWa: true,
    governorate: "",
    city: "",
    address: "",
    notes: "",
    paymentMethod: "COD",
    transferRef: ""
  });
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef<string | null>(null);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const verify = useCallback(async () => {
    const list = getCart();
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
        else if (r.changed) setNotice("تم تحديث الأسعار والكميات حسب المتاح حاليًا، راجعي الإجمالي.");
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
  const ready = items.length > 0 && status === "ok" && !!settings?.open && !hasUnavailable && !belowMin;

  async function onReceipt(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.url) throw new Error(d?.error || "فشل رفع الصورة");
      setReceiptUrl(d.url as string);
    } catch (e) {
      setError((e as Error).message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !ready) return;
    setError("");
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("لا يوجد اتصال بالإنترنت، جرّبي بعد ما يرجع.");
      return;
    }
    if (!form.governorate) {
      setError("اختاري المحافظة");
      return;
    }
    setSubmitting(true);
    if (!keyRef.current) keyRef.current = newKey();
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          phone: form.phone,
          whatsapp: form.sameWa ? form.phone : form.whatsapp,
          governorate: form.governorate,
          city: form.city,
          address: form.address,
          notes: form.notes || null,
          paymentMethod: form.paymentMethod,
          transferRef: form.paymentMethod === "VODAFONE_CASH" ? form.transferRef || null : null,
          receiptUrl: form.paymentMethod === "VODAFONE_CASH" ? receiptUrl : null,
          idempotencyKey: keyRef.current,
          items: items.map((i) => ({ productId: i.productId, qty: i.qty }))
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        setError(data?.error || "تعذر إتمام الطلب، جرّبي تاني");
        setSubmitting(false);
        return;
      }
      try {
        window.sessionStorage.removeItem(KEY_STORE);
      } catch {
        /* ignore */
      }
      clearCart();
      router.push(`/shop/order/${data.id}`);
    } catch {
      setError("تعذر الاتصال بالسيرفر. جرّبي تاني، ولن يتكرر الطلب.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen">
        <ShopHeader title="إتمام الطلب" backHref="/cart" />
        <div className="m-6 rounded-2xl bg-cream p-8 text-center">
          <p className="mb-4">عربة التسوق فاضية</p>
          <Link href="/shop" className="inline-block rounded-xl bg-wine px-6 py-3 font-bold text-cream">
            تصفحي المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen pb-28">
      <ShopHeader title="إتمام الطلب" backHref="/cart" />
      <main className="mx-auto max-w-xl px-4 py-4">
        {status === "offline" && (
          <div className="mb-3 rounded-xl bg-charcoal/10 p-3 text-sm font-semibold">
            تعذر التحقق من الأسعار والمخزون، لا يمكن إتمام الطلب الآن.{" "}
            <button type="button" onClick={verify} className="font-bold text-wine underline">
              إعادة المحاولة
            </button>
          </div>
        )}
        {notice && <div className="mb-3 rounded-xl bg-cream p-3 text-sm font-semibold text-wine">{notice}</div>}
        {settings && !settings.open && (
          <div className="mb-3 rounded-xl bg-charcoal/10 p-3 text-center font-bold">المتجر مغلق مؤقتًا</div>
        )}
        {hasUnavailable && (
          <div className="mb-3 rounded-xl bg-charcoal/10 p-3 text-sm font-bold text-wine">
            فيه منتج نفدت كميته، ارجعي للسلة واحذفيه.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-rosegold/25 bg-white p-4 shadow-soft">
            <h2 className="font-bold text-wine">بيانات التوصيل</h2>
            <input className={input} required placeholder="الاسم" autoComplete="name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
            <input className={input} required placeholder="رقم الموبايل" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.sameWa} onChange={(e) => set("sameWa", e.target.checked)} />
              رقم الواتساب نفس رقم الموبايل
            </label>
            {!form.sameWa && (
              <input className={input} required placeholder="رقم الواتساب" inputMode="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            )}
            <select className={input} required value={form.governorate} onChange={(e) => set("governorate", e.target.value)}>
              <option value="">اختاري المحافظة</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input className={input} required placeholder="المدينة أو المنطقة" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <textarea className="w-full rounded-xl border border-rosegold/40 bg-white p-4" rows={3} required placeholder="العنوان بالتفصيل" value={form.address} onChange={(e) => set("address", e.target.value)} />
            <textarea className="w-full rounded-xl border border-rosegold/40 bg-white p-4" rows={2} placeholder="ملاحظات إضافية (اختياري)" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </section>

          <section className="space-y-3 rounded-2xl border border-rosegold/25 bg-white p-4 shadow-soft">
            <h2 className="font-bold text-wine">طريقة الدفع</h2>
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.paymentMethod === "COD" ? "border-wine bg-cream" : "border-rosegold/30"}`}>
              <input type="radio" name="pay" checked={form.paymentMethod === "COD"} onChange={() => set("paymentMethod", "COD")} />
              <span className="font-bold">الدفع عند الاستلام</span>
            </label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${form.paymentMethod === "VODAFONE_CASH" ? "border-wine bg-cream" : "border-rosegold/30"}`}>
              <input type="radio" name="pay" checked={form.paymentMethod === "VODAFONE_CASH"} onChange={() => set("paymentMethod", "VODAFONE_CASH")} />
              <span className="font-bold">فودافون كاش</span>
            </label>
            {form.paymentMethod === "VODAFONE_CASH" && (
              <div className="space-y-3 rounded-xl bg-cream p-3 text-sm">
                {settings?.vodafoneNumber && (
                  <p>
                    حوّلي على رقم: <strong dir="ltr">{settings.vodafoneNumber}</strong>
                  </p>
                )}
                {settings?.paymentInstructions && <p className="whitespace-pre-line text-charcoal/80">{settings.paymentInstructions}</p>}
                <input className={input} placeholder="رقم عملية التحويل (اختياري)" value={form.transferRef} onChange={(e) => set("transferRef", e.target.value)} />
                <div>
                  <label className="mb-1 block font-semibold">صورة إيصال التحويل (اختياري)</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onReceipt(e.target.files?.[0])} />
                  {uploading && <p className="mt-1 text-xs">جاري الرفع...</p>}
                  {receiptUrl && <p className="mt-1 text-xs font-bold text-wine">تم رفع الإيصال ✓</p>}
                </div>
                <p className="text-xs font-bold text-wine">الطلب لا يُعتبر مدفوعًا إلا بعد مراجعة التحويل من الإدارة.</p>
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-2xl border border-rosegold/25 bg-white p-4 shadow-soft">
            <h2 className="font-bold text-wine">ملخص الطلب</h2>
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between text-sm">
                <span>
                  {i.name} × {i.qty}
                </span>
                <span className="font-bold">{money(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-rosegold/25 pt-2 text-sm">
              <span>إجمالي المنتجات</span>
              <span className="font-bold">{money(t.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>التوصيل</span>
              <span className="font-bold">{t.delivery === null ? "—" : t.delivery === 0 ? "مجاني" : money(t.delivery)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-bold">الإجمالي</span>
              <span className="font-bold text-wine">{money(t.total)}</span>
            </div>
            {belowMin && settings && <p className="text-sm font-bold text-wine">الحد الأدنى للطلب {money(settings.minOrder)}</p>}
          </section>

          {error && <p className="rounded-xl bg-charcoal/10 p-3 text-sm font-bold text-wine">{error}</p>}

          <button
            type="submit"
            disabled={!ready || submitting || uploading}
            className="min-h-[52px] w-full rounded-xl bg-wine py-3 text-lg font-bold text-cream disabled:opacity-50"
          >
            {submitting ? "جاري حفظ الطلب..." : status === "checking" ? "جاري التحقق..." : "تأكيد الطلب"}
          </button>
        </form>
      </main>
    </div>
  );
}
