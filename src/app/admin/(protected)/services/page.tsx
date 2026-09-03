"use client";

import { useEffect, useState } from "react";
import { formatEGP } from "@/lib/utils";
import { uploadImageDirect } from "@/lib/client-upload";

type ServiceStatus = "AVAILABLE" | "COMING_SOON" | "HIDDEN";

interface Service {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  discountPrice: string | null;
  durationMin: number;
  bufferMin: number;
  status: ServiceStatus;
  isActive: boolean;
  sortOrder: number;
}

const categories = [
  ["hair", "الشعر"],
  ["hair-gel", "Hair Gel"],
  ["skin", "البشرة"],
  ["makeup", "المكياج"],
  ["nails", "الأظافر"],
  ["hair-removal", "إزالة الشعر"],
  ["body-care", "العناية"],
  ["bridal", "العروس"],
  ["general", "أخرى"]
];

const statusOptions: Array<[ServiceStatus, string]> = [
  ["AVAILABLE", "متاحة للحجز"],
  ["COMING_SOON", "قريبًا"],
  ["HIDDEN", "مخفية"]
];

const emptyForm = {
  name: "",
  nameEn: "",
  slug: "",
  category: "general",
  description: "",
  imageUrl: "",
  price: "",
  discountPrice: "",
  durationMin: "60",
  bufferMin: "0",
  status: "AVAILABLE" as ServiceStatus,
  sortOrder: "0"
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/services?all=1");
    if (res.ok) setServices(await res.json());
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
      nameEn: s.nameEn || "",
      slug: s.slug,
      category: s.category,
      description: s.description || "",
      imageUrl: s.imageUrl || "",
      price: s.price,
      discountPrice: s.discountPrice || "",
      durationMin: String(s.durationMin),
      bufferMin: String(s.bufferMin ?? 0),
      status: s.status,
      sortOrder: String(s.sortOrder ?? 0)
    });
    setEditingId(s.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseFloat(form.price);

    if (!Number.isFinite(price) || price < 0) {
      setError("اكتبي سعر الخدمة بشكل صحيح");
      return;
    }

    if (form.status === "AVAILABLE" && price <= 0) {
      setError("الخدمة المتاحة للحجز يجب أن يكون لها سعر أكبر من صفر");
      return;
    }

    const payload = {
      name: form.name,
      nameEn: form.nameEn || null,
      slug:
        form.slug ||
        form.name
          .toLowerCase()
          .replace(/\s+/g, "-"),
      category: form.category,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      price,
      discountPrice: form.discountPrice
        ? parseFloat(form.discountPrice)
        : null,
      durationMin: parseInt(form.durationMin, 10),
      bufferMin: parseInt(form.bufferMin || "0", 10),
      status: form.status,
      isActive: form.status !== "HIDDEN",
      sortOrder: parseInt(form.sortOrder || "0", 10)
    };

    const res = await fetch(
      editingId ? `/api/services/${editingId}` : "/api/services",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "تحققي من صحة البيانات المدخلة");
      return;
    }

    setShowForm(false);
    await load();
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const url = await uploadImageDirect(file, "services");
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err: any) {
      alert(err.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function updateStatus(
    service: Service,
    status: ServiceStatus
  ) {
    await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        isActive: status !== "HIDDEN"
      })
    });

    await load();
  }

  async function loadCatalog() {
    setCatalogLoading(true);

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog: true })
      });

      if (!res.ok) {
        throw new Error("تعذر تحميل قائمة الخدمات");
      }

      const data = await res.json();

      alert(
        data.created > 0
          ? `تمت إضافة ${data.created} خدمة جديدة. كلها بحالة "قريبًا" حتى تحددي الأسعار والحالة.`
          : "كل الخدمات الأساسية موجودة بالفعل."
      );

      await load();
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setCatalogLoading(false);
    }
  }

  const availableCount = services.filter(
    (s) => s.status === "AVAILABLE"
  ).length;

  const comingSoonCount = services.filter(
    (s) => s.status === "COMING_SOON"
  ).length;

  const hiddenCount = services.filter(
    (s) => s.status === "HIDDEN"
  ).length;

  const categoryLabel = (value: string) =>
    categories.find(([key]) => key === value)?.[1] || "أخرى";

  return (
    <div dir="rtl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-charcoal">
            إدارة الخدمات
          </h1>
          <p className="mt-1 text-sm text-charcoal/50">
            تحكمي في الخدمات والأسعار والتصنيفات وحالة الظهور والحجز.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadCatalog}
            disabled={catalogLoading}
            className="btn-secondary !py-2 text-sm"
          >
            {catalogLoading
              ? "جاري التحميل..."
              : "＋ إضافة قائمة الخدمات الأساسية"}
          </button>

          <button
            onClick={startCreate}
            className="btn-primary !py-2 text-sm"
          >
            ＋ خدمة جديدة
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">متاحة</p>
          <p className="mt-1 text-2xl font-extrabold text-green-600">
            {availableCount}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">قريبًا</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {comingSoonCount}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">مخفية</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">
            {hiddenCount}
          </p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card mb-6 flex flex-col gap-4 p-5"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="اسم الخدمة بالعربي"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className="input-field"
              required
            />

            <input
              placeholder="اسم الخدمة بالإنجليزي"
              value={form.nameEn}
              onChange={(e) =>
                setForm({ ...form, nameEn: e.target.value })
              }
              className="input-field"
              dir="ltr"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              className="input-field"
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as ServiceStatus
                })
              }
              className="input-field"
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <input
            placeholder="slug"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value })
            }
            className="input-field"
            dir="ltr"
          />

          <textarea
            placeholder="وصف الخدمة"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="input-field"
          />

          <label className="cursor-pointer rounded-xl border-2 border-dashed border-wine/40 p-4 text-center text-sm">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {uploading ? (
              <span className="text-charcoal/50">
                جاري رفع الصورة...
              </span>
            ) : form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt=""
                className="mx-auto max-h-32 rounded-xl object-cover"
              />
            ) : (
              <span className="text-wine">
                📷 صورة الخدمة
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input
              placeholder="السعر"
              type="number"
              min="0"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value })
              }
              className="input-field"
              required
            />

            <input
              placeholder="السعر بعد الخصم"
              type="number"
              min="0"
              value={form.discountPrice}
              onChange={(e) =>
                setForm({
                  ...form,
                  discountPrice: e.target.value
                })
              }
              className="input-field"
            />

            <input
              placeholder="المدة بالدقائق"
              type="number"
              min="1"
              value={form.durationMin}
              onChange={(e) =>
                setForm({
                  ...form,
                  durationMin: e.target.value
                })
              }
              className="input-field"
              required
            />

            <input
              placeholder="ترتيب العرض"
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({
                  ...form,
                  sortOrder: e.target.value
                })
              }
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-charcoal/50">
              فترة الراحة الإجبارية بعد الخدمة بالدقائق
            </label>

            <input
              placeholder="مثال: 30"
              type="number"
              min="0"
              value={form.bufferMin}
              onChange={(e) =>
                setForm({
                  ...form,
                  bufferMin: e.target.value
                })
              }
              className="input-field"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary !py-2 text-sm"
            >
              حفظ الخدمة
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary !py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="card flex flex-wrap items-center gap-4 p-4"
          >
            {s.imageUrl ? (
              <div
                className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(${s.imageUrl})`
                }}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blush text-xl">
                ✨
              </div>
            )}

            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-charcoal">
                  {s.name}
                </p>

                {s.nameEn && (
                  <span className="text-xs text-charcoal/40" dir="ltr">
                    {s.nameEn}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-charcoal/50">
                {categoryLabel(s.category)} · {s.durationMin} دقيقة
                {s.bufferMin > 0 &&
                  ` · راحة ${s.bufferMin} دقيقة`}
              </p>

              <div className="mt-1 flex items-center gap-2">
                {s.price > "0" ? (
                  <>
                    {s.discountPrice && (
                      <span className="text-xs text-charcoal/40 line-through">
                        {formatEGP(s.price)}
                      </span>
                    )}

                    <span className="font-display font-extrabold text-wine">
                      {formatEGP(
                        s.discountPrice ?? s.price
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-amber-600">
                    السعر لم يُحدد بعد
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={s.status}
                onChange={(e) =>
                  updateStatus(
                    s,
                    e.target.value as ServiceStatus
                  )
                }
                className="rounded-full border border-charcoal/15 bg-white px-3 py-2 text-xs font-bold"
              >
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => startEdit(s)}
                className="btn-secondary !py-2 text-xs"
              >
                تعديل
              </button>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="card p-8 text-center text-charcoal/50">
            لا توجد خدمات. استخدمي "إضافة قائمة الخدمات الأساسية".
          </div>
        )}
      </div>
    </div>
  );
}
