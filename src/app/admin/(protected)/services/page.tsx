"use client";

import { useEffect, useState } from "react";
import { formatEGP } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  discountPrice: string | null;
  durationMin: number;
  isActive: boolean;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  discountPrice: "",
  durationMin: "60"
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/services?all=1");
    setServices(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(s: Service) {
    setForm({
      name: s.name,
      slug: s.slug,
      description: s.description || "",
      price: s.price,
      discountPrice: s.discountPrice || "",
      durationMin: String(s.durationMin)
    });
    setEditingId(s.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
      description: form.description || undefined,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      durationMin: parseInt(form.durationMin, 10)
    };

    const res = await fetch(editingId ? `/api/services/${editingId}` : "/api/services", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      setError("تحققي من صحة البيانات المدخلة");
      return;
    }
    setShowForm(false);
    load();
  }

  async function toggleActive(s: Service) {
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive })
    });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">إدارة الخدمات</h1>
        <button onClick={startCreate} className="btn-primary !py-2 text-sm">
          + خدمة جديدة
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-4 p-5">
          <input
            placeholder="اسم الخدمة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            required
          />
          <input
            placeholder="slug (مثال: hair-styling)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="input-field"
            dir="ltr"
          />
          <textarea
            placeholder="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="السعر"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input-field"
              required
            />
            <input
              placeholder="السعر بعد الخصم"
              type="number"
              value={form.discountPrice}
              onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="المدة (دقيقة)"
              type="number"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
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
        {services.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold text-charcoal">
                {s.name} {!s.isActive && <span className="text-xs text-red-500">(غير مفعّلة)</span>}
              </p>
              <p className="text-sm text-charcoal/50">
                {formatEGP(s.discountPrice ?? s.price)} · {s.durationMin} دقيقة
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(s)} className="btn-secondary !py-2 text-xs">
                تعديل
              </button>
              <button
                onClick={() => toggleActive(s)}
                className="rounded-full border-2 border-charcoal/20 px-4 py-2 text-xs font-bold text-charcoal/60 hover:bg-charcoal/5"
              >
                {s.isActive ? "إخفاء" : "تفعيل"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
