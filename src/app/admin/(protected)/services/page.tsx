"use client";

import { useEffect, useState } from "react";
import { formatEGP } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  discountPrice: string | null;
  durationMin: number;
  bufferMin: number;
  isActive: boolean;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  price: "",
  discountPrice: "",
  durationMin: "60",
  bufferMin: "0"
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      imageUrl: s.imageUrl || "",
      price: s.price,
      discountPrice: s.discountPrice || "",
      durationMin: String(s.durationMin),
      bufferMin: String(s.bufferMin ?? 0)
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
      imageUrl: form.imageUrl || undefined,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      durationMin: parseInt(form.durationMin, 10),
      bufferMin: parseInt(form.bufferMin || "0", 10)
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setForm((f) => ({ ...f, imageUrl: data.url }));
    } finally {
      setUploading(false);
    }
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
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-wine/40 p-4 text-center text-sm">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {uploading ? (
              <span className="text-charcoal/50">جاري الرفع...</span>
            ) : form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="mx-auto max-h-24 rounded-lg" />
            ) : (
              <span className="text-wine">📷 صورة الخدمة (اختياري)</span>
            )}
          </label>
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
          <div>
            <label className="mb-1 block text-xs text-charcoal/50">
              فترة راحة إجبارية بعد الخدمة (دقيقة) — مفيش حجز جديد قبلها تخلص
            </label>
            <input
              placeholder="مثال: 60"
              type="number"
              min={0}
              value={form.bufferMin}
              onChange={(e) => setForm({ ...form, bufferMin: e.target.value })}
              className="input-field"
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
          <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
            {s.imageUrl && (
              <div className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${s.imageUrl})` }} />
            )}
            <div className="flex-1">
              <p className="font-bold text-charcoal">
                {s.name} {!s.isActive && <span className="text-xs text-red-500">(غير مفعّلة)</span>}
              </p>
              <p className="text-sm text-charcoal/50">
                {formatEGP(s.discountPrice ?? s.price)} · {s.durationMin} دقيقة
                {s.bufferMin > 0 && ` · راحة ${s.bufferMin} دقيقة`}
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
