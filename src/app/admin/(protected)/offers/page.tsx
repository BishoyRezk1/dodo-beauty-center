"use client";

import { useEffect, useState } from "react";
import { formatEGP, formatArabicDate } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
}
interface Offer {
  id: string;
  title: string;
  details: string | null;
  oldPrice: string;
  newPrice: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  serviceId: string | null;
  service: Service | null;
}

const emptyForm = {
  title: "",
  details: "",
  oldPrice: "",
  newPrice: "",
  startDate: "",
  endDate: "",
  serviceId: ""
};

export default function OffersAdminPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [o, s] = await Promise.all([
      fetch("/api/offers?all=1").then((r) => r.json()),
      fetch("/api/services?all=1").then((r) => r.json())
    ]);
    setOffers(o);
    setServices(s);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: form.title,
      details: form.details || undefined,
      oldPrice: parseFloat(form.oldPrice),
      newPrice: parseFloat(form.newPrice),
      startDate: form.startDate,
      endDate: form.endDate,
      serviceId: form.serviceId || null
    };
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      setError("تحققي من صحة البيانات المدخلة");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function toggleActive(o: Offer) {
    await fetch(`/api/offers/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !o.isActive })
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("هل أنتِ متأكدة من حذف هذا العرض؟")) return;
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">إدارة العروض</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary !py-2 text-sm">
          + عرض جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-4 p-5">
          <input
            placeholder="اسم العرض"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
            required
          />
          <textarea
            placeholder="تفاصيل العرض"
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            className="input-field"
          />
          <select
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="input-field"
          >
            <option value="">بدون ربط بخدمة محددة</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="السعر القديم"
              type="number"
              value={form.oldPrice}
              onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="السعر الجديد"
              type="number"
              value={form.newPrice}
              onChange={(e) => setForm({ ...form, newPrice: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="input-field"
              required
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="input-field"
              required
            />
          </div>
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
        {offers.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold text-charcoal">
                {o.title} {!o.isActive && <span className="text-xs text-red-500">(متوقف)</span>}
              </p>
              <p className="text-sm text-charcoal/50">
                {formatEGP(o.oldPrice)} → {formatEGP(o.newPrice)} · حتى {formatArabicDate(o.endDate)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(o)} className="btn-secondary !py-2 text-xs">
                {o.isActive ? "إيقاف" : "تفعيل"}
              </button>
              <button
                onClick={() => remove(o.id)}
                className="rounded-full border-2 border-red-400 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
