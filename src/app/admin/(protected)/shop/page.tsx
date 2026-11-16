"use client";

import { useCallback, useEffect, useState } from "react";
import ShopAdminTabs from "@/components/admin/ShopAdminTabs";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/shop/labels";
import { money } from "@/lib/shop/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Item = { id: string; name: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = {
  id: string;
  orderNo: number;
  customerName: string;
  phone: string;
  whatsapp: string;
  governorate: string;
  city: string;
  address: string;
  notes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  transferRef: string | null;
  receiptUrl: string | null;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  adminNotes: string | null;
  createdAt: string;
  items: Item[];
};

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (q) p.set("q", q);
      const r = await fetch(`/api/admin/shop/orders?${p.toString()}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || "تعذر تحميل الطلبات");
      setOrders(d.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(o: Order, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/shop/orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.order) {
      alert(d?.error || "تعذر التحديث");
      return;
    }
    setOrders((list) => list.map((x) => (x.id === o.id ? d.order : x)));
  }

  function changeStatus(o: Order, v: string) {
    if (v === o.status) return;
    if (v === "CANCELLED" && !confirm("إلغاء الطلب هيرجّع الكميات للمخزون، ومش هينفع تعيدي تفعيله. متأكدة؟")) return;
    patch(o, { status: v });
  }

  const sel = "input-field !py-2 text-sm";

  return (
    <div>
      <ShopAdminTabs />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(qInput.trim());
        }}
        className="mb-3 flex gap-2"
      >
        <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="بحث: رقم الطلب / الاسم / الهاتف" className="input-field flex-1" />
        <button type="submit" className="btn-primary !py-2 text-sm">
          بحث
        </button>
      </form>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[["", "الكل"], ...Object.entries(ORDER_STATUS_LABEL)].map(([k, label]) => (
          <button
            key={k || "all"}
            type="button"
            onClick={() => setStatus(k)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${
              status === k ? "border-wine bg-wine text-cream" : "border-rosegold/40 bg-white text-charcoal/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-sm font-bold text-red-600">
          {error}{" "}
          <button type="button" onClick={load} className="underline">
            إعادة المحاولة
          </button>
        </p>
      )}
      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}
      {!loading && !error && orders.length === 0 && <p className="text-charcoal/50">لا توجد طلبات</p>}

      <div className="flex flex-col gap-3">
        {orders.map((o) => {
          const open = openId === o.id;
          const cancelled = o.status === "CANCELLED";
          return (
            <div key={o.id} className="card p-4">
              <button type="button" onClick={() => setOpenId(open ? null : o.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-right">
                <span className="font-bold text-wine">
                  #{o.orderNo} · {o.customerName}
                </span>
                <span className="font-bold">{money(o.total)}</span>
                <span className="w-full text-xs text-charcoal/60">
                  {ORDER_STATUS_LABEL[o.status] || o.status} · {PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod} ·{" "}
                  {PAYMENT_STATUS_LABEL[o.paymentStatus] || o.paymentStatus} · {new Date(o.createdAt).toLocaleString("ar-EG")}
                </span>
              </button>

              {open && (
                <div className="mt-3 space-y-3 border-t border-rosegold/20 pt-3 text-sm">
                  <div className="flex flex-wrap gap-3">
                    <a href={`tel:${o.phone}`} dir="ltr" className="font-bold text-wine underline">
                      {o.phone}
                    </a>
                    <a
                      href={buildWhatsAppLink(o.whatsapp, `مرحبًا ${o.customerName}، بخصوص طلبك رقم #${o.orderNo} من DoDo Beauty Shop 💗`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#128C7E] underline"
                    >
                      واتساب العميلة
                    </a>
                  </div>
                  <p>
                    {o.governorate} - {o.city} - {o.address}
                  </p>
                  {o.notes && <p className="text-charcoal/70">ملاحظات العميلة: {o.notes}</p>}

                  <div>
                    {o.items.map((i) => (
                      <div key={i.id} className="flex justify-between py-0.5">
                        <span>
                          {i.name} × {i.quantity}
                        </span>
                        <span className="font-bold">{money(i.lineTotal)}</span>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t border-rosegold/20 pt-1">
                      <span>التوصيل</span>
                      <span>{o.deliveryFee === 0 ? "عبر التواصل" : money(o.deliveryFee)}</span>
                    </div>
                    {o.discountTotal > 0 && (
                      <div className="flex justify-between text-wine">
                        <span>إجمالي الخصم</span>
                        <span>{money(o.discountTotal)}</span>
                      </div>
                    )}
                  </div>

                  {(o.transferRef || o.receiptUrl) && (
                    <div className="rounded-xl bg-cream p-3">
                      {o.transferRef && <p>رقم العملية: {o.transferRef}</p>}
                      {o.receiptUrl && (
                        <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-wine underline">
                          عرض إيصال التحويل
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold">حالة الطلب</span>
                      <select className={sel} value={o.status} disabled={cancelled} onChange={(e) => changeStatus(o, e.target.value)}>
                        {Object.entries(ORDER_STATUS_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold">حالة الدفع</span>
                      <select className={sel} value={o.paymentStatus} onChange={(e) => patch(o, { paymentStatus: e.target.value })}>
                        {Object.entries(PAYMENT_STATUS_LABEL).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold">ملاحظات داخلية</span>
                    <textarea
                      className="input-field"
                      rows={2}
                      value={notes[o.id] ?? o.adminNotes ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                    />
                    <button type="button" onClick={() => patch(o, { adminNotes: notes[o.id] ?? o.adminNotes ?? "" })} className="btn-secondary mt-2 !py-2 text-xs">
                      حفظ الملاحظات
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
