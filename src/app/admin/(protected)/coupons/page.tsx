"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
}
interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  service: Service | null;
}

const emptyForm = { code: "", discountPercent: "10", maxUses: "", expiresAt: "", serviceId: "" };

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [c, s] = await Promise.all([
      fetch("/api/coupons").then((r) => r.json()),
      fetch("/api/services?all=1").then((r) => r.json())
    ]);
    setCoupons(c);
    setServices(s);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discountPercent: parseInt(form.discountPercent, 10),
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        expiresAt: form.expiresAt || null,
        serviceId: form.serviceId || null
      })
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "تحققي من البيانات");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function toggleActive(c: Coupon) {
    await fetch(`/api/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive })
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف كود الخصم؟")) return;
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">كوبونات الخصم</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary !py-2 text-sm">
          + كود جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-4 p-5">
          <input
            placeholder="الكود (مثال: WELCOME10)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="input-field"
            dir="ltr"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="نسبة الخصم %"
              type="number"
              min={1}
              max={100}
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="عدد الاستخدامات (اختياري)"
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              className="input-field"
            />
          </div>
          <input
            type="date"
            placeholder="تاريخ الانتهاء (اختياري)"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="input-field"
          />
          <select
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="input-field"
          >
            <option value="">يعمل على كل الخدمات</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary !py-2 text-sm">
              حفظ
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary !py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {coupons.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p dir="ltr" className="font-mono font-bold text-wine">
                {c.code} {!c.isActive && <span className="text-xs text-red-500">(متوقف)</span>}
              </p>
              <p className="text-sm text-charcoal/50">
                خصم {c.discountPercent}% {c.service ? `— ${c.service.name}` : "— كل الخدمات"}
              </p>
              <p className="text-xs text-charcoal/40">
                استُخدم {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : ""}
                {c.expiresAt && ` · ينتهي ${new Date(c.expiresAt).toLocaleDateString("ar-EG")}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(c)} className="btn-secondary !py-2 text-xs">
                {c.isActive ? "إيقاف" : "تفعيل"}
              </button>
              <button
                onClick={() => remove(c.id)}
                className="rounded-full border-2 border-red-400 px-4 py-2 text-xs font-bold text-red-500"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-charcoal/50">لا توجد أكواد خصم بعد</p>}
      </div>
    </div>
  );
}
