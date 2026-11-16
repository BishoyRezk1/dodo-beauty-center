"use client";

import { useCallback, useEffect, useState } from "react";
import ShopAdminTabs from "@/components/admin/ShopAdminTabs";
import { money } from "@/lib/shop/format";

type Cat = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  price: number;
  comparePrice: number | null;
  stock: number;
  lowStockAt: number;
  lowStock: boolean;
  categoryId: string | null;
  category: { name: string } | null;
  isActive: boolean;
  isArchived: boolean;
};
type PForm = {
  id?: string;
  name: string;
  categoryId: string;
  price: string;
  comparePrice: string;
  stock: string;
  lowStockAt: string;
  sku: string;
  description: string;
  imageUrl: string | null;
  images: string[];
  isActive: boolean;
};
type Filter = "all" | "low" | "out" | "hidden" | "archived";

const EMPTY: PForm = {
  name: "",
  categoryId: "",
  price: "",
  comparePrice: "",
  stock: "0",
  lowStockAt: "3",
  sku: "",
  description: "",
  imageUrl: null,
  images: [],
  isActive: true
};

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/shop/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.url) throw new Error(d?.error || "فشل رفع الصورة");
  return d.url as string;
}

export default function ShopProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<PForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/shop/products${filter === "archived" ? "?archived=1" : ""}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر تحميل المنتجات");
      setProducts(d.items);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/admin/shop/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCats(d.items || []))
      .catch(() => {});
  }, []);

  function edit(p: Product) {
    setError("");
    setForm({
      id: p.id,
      name: p.name,
      categoryId: p.categoryId || "",
      price: String(p.price),
      comparePrice: p.comparePrice != null ? String(p.comparePrice) : "",
      stock: String(p.stock),
      lowStockAt: String(p.lowStockAt),
      sku: p.sku || "",
      description: p.description || "",
      imageUrl: p.imageUrl,
      images: p.images,
      isActive: p.isActive
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      categoryId: form.categoryId || null,
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
      stock: Number(form.stock) || 0,
      lowStockAt: Number(form.lowStockAt) || 0,
      sku: form.sku || null,
      description: form.description || null,
      imageUrl: form.imageUrl,
      images: form.images,
      isActive: form.isActive
    };
    try {
      const r = await fetch(form.id ? `/api/admin/shop/products/${form.id}` : "/api/admin/shop/products", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.error || "تحققي من البيانات");
        setSaving(false);
        return;
      }
      setForm(null);
      load();
    } catch {
      setError("تعذر الاتصال بالسيرفر");
    }
    setSaving(false);
  }

  async function quick(p: Product, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/shop/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      alert(d?.error || "تعذر التحديث");
    }
    load();
  }

  async function archive(p: Product) {
    if (!confirm(`أرشفة "${p.name}"؟ الطلبات القديمة مش هتتأثر.`)) return;
    await fetch(`/api/admin/shop/products/${p.id}`, { method: "DELETE" });
    load();
  }

  async function onMain(file?: File) {
    if (!file || !form) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(file);
      setForm((f) => (f ? { ...f, imageUrl: url } : f));
    } catch (e) {
      setError((e as Error).message);
    }
    setUploading(false);
  }

  async function onExtra(files: FileList | null) {
    if (!files || !form) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (form.images.length + urls.length >= 8) break;
        urls.push(await uploadFile(f));
      }
      setForm((f) => (f ? { ...f, images: [...f.images, ...urls] } : f));
    } catch (e) {
      setError((e as Error).message);
    }
    setUploading(false);
  }

  const s = search.trim().toLowerCase();
  const shown = products.filter((p) => {
    if (s && !p.name.toLowerCase().includes(s) && !(p.sku || "").toLowerCase().includes(s)) return false;
    if (filter === "low") return p.lowStock;
    if (filter === "out") return p.stock <= 0;
    if (filter === "hidden") return !p.isActive;
    return true;
  });

  const chips: [Filter, string][] = [
    ["all", "الكل"],
    ["low", "مخزون منخفض"],
    ["out", "نفدت الكمية"],
    ["hidden", "مخفي"],
    ["archived", "الأرشيف"]
  ];

  return (
    <div>
      <ShopAdminTabs />

      <div className="mb-3 flex gap-2">
        <input className="input-field flex-1" placeholder="بحث بالاسم أو SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button
          type="button"
          className="btn-primary !py-2 text-sm"
          onClick={() => {
            setError("");
            setForm({ ...EMPTY });
          }}
        >
          + منتج
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${
              filter === k ? "border-wine bg-wine text-cream" : "border-rosegold/40 bg-white text-charcoal/70"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {form && (
        <form onSubmit={save} className="card mb-5 flex flex-col gap-3 p-5">
          <h2 className="font-bold text-wine">{form.id ? "تعديل منتج" : "منتج جديد"}</h2>
          <input className="input-field" placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input-field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">بدون تصنيف</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" type="number" step="0.01" min={0} placeholder="السعر الحالي" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input className="input-field" type="number" step="0.01" min={0} placeholder="السعر قبل الخصم (اختياري)" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} />
            <input className="input-field" type="number" min={0} placeholder="الكمية المتاحة" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            <input className="input-field" type="number" min={0} placeholder="تنبيه عند أقل من" value={form.lowStockAt} onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })} />
          </div>
          <input className="input-field" dir="ltr" placeholder="كود SKU (اختياري)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <textarea className="input-field" rows={4} placeholder="وصف المنتج" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div>
            <span className="mb-1 block text-sm font-bold">الصورة الرئيسية</span>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="mb-2 h-28 w-28 rounded-xl object-cover" />}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onMain(e.target.files?.[0])} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-bold">صور إضافية (حتى 8)</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {form.images.map((u, i) => (
                <div key={u + i} className="relative">
                  <img src={u} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label="حذف الصورة"
                    onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                    className="absolute -left-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onExtra(e.target.files)} />
          </div>
          {uploading && <p className="text-xs text-charcoal/60">جاري رفع الصور...</p>}

          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            المنتج ظاهر في المتجر
          </label>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving || uploading} className="btn-primary !py-2 text-sm disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="btn-secondary !py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {loadError && <p className="mb-3 text-sm font-bold text-red-600">{loadError}</p>}
      {shown.length === 0 && !loadError && <p className="text-charcoal/50">لا توجد منتجات</p>}

      <div className="flex flex-col gap-3">
        {shown.map((p) => (
          <div key={p.id} className="card flex gap-3 p-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-2xl">💗</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-bold text-charcoal">{p.name}</span>
              <span className="text-xs text-charcoal/60">
                {p.category?.name || "بدون تصنيف"} {p.sku ? `· ${p.sku}` : ""} {!p.isActive && "· مخفي"}
              </span>
              <span className="text-sm font-bold text-wine">
                {money(p.price)} {p.comparePrice ? <s className="text-xs font-normal text-charcoal/50">{money(p.comparePrice)}</s> : null}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  المخزون
                  <input
                    key={`${p.id}-${p.stock}`}
                    type="number"
                    min={0}
                    defaultValue={p.stock}
                    onBlur={(e) => {
                      const v = Math.max(0, Math.floor(Number(e.target.value)));
                      if (Number.isFinite(v) && v !== p.stock) quick(p, { stock: v });
                    }}
                    className="input-field !w-20 !py-1 text-sm"
                  />
                </label>
                {p.stock <= 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">نفد</span>
                ) : p.lowStock ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">منخفض</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {p.isArchived ? (
                  <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => quick(p, { isArchived: false, isActive: true })}>
                    استرجاع
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => edit(p)}>
                      تعديل
                    </button>
                    <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => quick(p, { isActive: !p.isActive })}>
                      {p.isActive ? "إخفاء" : "إظهار"}
                    </button>
                    <button type="button" className="rounded-full border-2 border-red-400 px-3 py-1.5 text-xs font-bold text-red-500" onClick={() => archive(p)}>
                      أرشفة
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
