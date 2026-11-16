"use client";

import { useEffect, useState } from "react";
import ShopAdminTabs from "@/components/admin/ShopAdminTabs";

type S = {
  open: boolean;
  whatsapp: string;
  vodafoneNumber: string;
  paymentInstructions: string;
  deliveryFee: string;
  freeDeliveryOver: string;
  minOrder: string;
  deliveryPolicy: string;
};

export default function ShopSettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/shop/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setS({
          open: !!d.open,
          whatsapp: d.whatsapp || "",
          vodafoneNumber: d.vodafoneNumber || "",
          paymentInstructions: d.paymentInstructions || "",
          deliveryFee: String(d.deliveryFee ?? 0),
          freeDeliveryOver: String(d.freeDeliveryOver ?? 0),
          minOrder: String(d.minOrder ?? 0),
          deliveryPolicy: d.deliveryPolicy || ""
        })
      )
      .catch(() => setMsg("تعذر تحميل الإعدادات"));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setMsg("");
    const r = await fetch("/api/admin/shop/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...s,
        deliveryFee: Number(s.deliveryFee) || 0,
        freeDeliveryOver: Number(s.freeDeliveryOver) || 0,
        minOrder: Number(s.minOrder) || 0
      })
    });
    const d = await r.json().catch(() => null);
    setMsg(r.ok ? "تم الحفظ ✓" : d?.error || "تعذر الحفظ");
    setSaving(false);
  }

  if (!s) {
    return (
      <div>
        <ShopAdminTabs />
        <p className="text-charcoal/50">{msg || "جاري التحميل..."}</p>
      </div>
    );
  }
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });

  return (
    <div>
      <ShopAdminTabs />
      <form onSubmit={save} className="card flex max-w-xl flex-col gap-4 p-5">
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" checked={s.open} onChange={(e) => set("open", e.target.checked)} />
          المتجر مفتوح (إلغاء التحديد = مغلق ولا يقبل طلبات)
        </label>
        <label>
          <span className="mb-1 block text-sm font-bold">رقم واتساب استقبال الطلبات (فاضي = رقم الموقع الحالي)</span>
          <input className="input-field" dir="ltr" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="2010XXXXXXXX" />
        </label>
        <label>
          <span className="mb-1 block text-sm font-bold">رقم فودافون كاش للمتجر</span>
          <input className="input-field" dir="ltr" value={s.vodafoneNumber} onChange={(e) => set("vodafoneNumber", e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-bold">تعليمات التحويل</span>
          <textarea className="input-field" rows={3} value={s.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className="mb-1 block text-xs font-bold">مصاريف الشحن</span>
            <input className="input-field" type="number" min={0} value={s.deliveryFee} onChange={(e) => set("deliveryFee", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold">شحن مجاني من</span>
            <input className="input-field" type="number" min={0} value={s.freeDeliveryOver} onChange={(e) => set("freeDeliveryOver", e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold">الحد الأدنى للطلب</span>
            <input className="input-field" type="number" min={0} value={s.minOrder} onChange={(e) => set("minOrder", e.target.value)} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-charcoal/50">اكتبي 0 في "شحن مجاني من" أو "الحد الأدنى" لإلغائهم.</p>
        <label>
          <span className="mb-1 block text-sm font-bold">سياسة التوصيل (تظهر في السلة)</span>
          <textarea className="input-field" rows={3} value={s.deliveryPolicy} onChange={(e) => set("deliveryPolicy", e.target.value)} />
        </label>
        {msg && <p className="text-sm font-bold text-wine">{msg}</p>}
        <button type="submit" disabled={saving} className="btn-primary !py-3 disabled:opacity-50">
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </form>
    </div>
  );
}
