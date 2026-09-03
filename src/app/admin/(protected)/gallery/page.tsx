"use client";

import { useEffect, useState } from "react";
import { uploadImageDirect } from "@/lib/client-upload";

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  beforeUrl: string | null;
  isActive: boolean;
}

// Just suggestions for the datalist — the admin can type any category she wants.
const categorySuggestions = ["تسريحات شعر", "صبغات", "هير جل", "ميكب", "عناية بالبشرة", "قبل وبعد"];

export default function GalleryAdminPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  async function load() {
    const res = await fetch("/api/gallery?all=1");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadFile(f: File): Promise<string> {
    return uploadImageDirect(f, "gallery");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !category.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await uploadFile(file);
      const beforeUrl = beforeFile ? await uploadFile(beforeFile) : undefined;
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category: category.trim(), imageUrl, beforeUrl })
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      setTitle("");
      setCategory("");
      setFile(null);
      setBeforeFile(null);
      setPreview(null);
      setBeforePreview(null);
      load();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(item: GalleryItem) {
    await fetch(`/api/gallery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive })
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا العمل من المعرض؟")) return;
    await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">معرض الأعمال</h1>

      <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-4 p-5">
        <input
          placeholder="اسم العمل (مثال: صبغة بلاتينيوم)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          required
        />
        <input
          list="gallery-categories"
          placeholder="التصنيف (اكتبي أي اسم تحبيه، مثال: هير جل)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field"
          required
        />
        <datalist id="gallery-categories">
          {categorySuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-wine/40 p-4 text-center text-sm">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }
              }}
            />
            {preview ? (
              <img src={preview} alt="" className="mx-auto max-h-24 rounded-lg" />
            ) : (
              <span className="text-wine">📷 الصورة الأساسية</span>
            )}
          </label>
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-charcoal/20 p-4 text-center text-sm">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setBeforeFile(f);
                  setBeforePreview(URL.createObjectURL(f));
                }
              }}
            />
            {beforePreview ? (
              <img src={beforePreview} alt="" className="mx-auto max-h-24 rounded-lg" />
            ) : (
              <span className="text-charcoal/50">📷 صورة "قبل" (اختياري)</span>
            )}
          </label>
        </div>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={uploading || !file || !title.trim() || !category.trim()}
          className="btn-primary"
        >
          {uploading ? "جاري الرفع..." : "إضافة للمعرض"}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setLightbox(item)}
              className="block h-28 w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.imageUrl})` }}
              aria-label="تكبير الصورة"
            />
            <div className="p-2">
              <p className="truncate text-xs font-bold text-charcoal">{item.title}</p>
              <p className="mb-2 truncate text-[10px] text-charcoal/40">{item.category}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(item)}
                  className="flex-1 rounded-lg border border-charcoal/20 py-1 text-[10px] font-bold text-charcoal/60"
                >
                  {item.isActive ? "إخفاء" : "إظهار"}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="flex-1 rounded-lg border border-red-300 py-1 text-[10px] font-bold text-red-500"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="text-charcoal/50">لا توجد أعمال مضافة بعد</p>}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          {lightbox.beforeUrl && (
            <div className="flex gap-2">
              <img src={lightbox.beforeUrl} alt="قبل" className="max-h-[40vh] rounded-xl" />
              <img src={lightbox.imageUrl} alt="بعد" className="max-h-[40vh] rounded-xl" />
            </div>
          )}
          {!lightbox.beforeUrl && (
            <img src={lightbox.imageUrl} alt={lightbox.title} className="max-h-[80vh] max-w-full rounded-xl" />
          )}
          <p className="text-sm font-bold text-white">{lightbox.title} — {lightbox.category}</p>
        </div>
      )}
    </div>
  );
}
