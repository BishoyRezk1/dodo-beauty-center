"use client";

import { useEffect, useState } from "react";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  booking: { service: { name: string } } | null;
}

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reviews?all=1", { cache: "no-store" });
    if (res.ok) setReviews(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id: string, body: Record<string, boolean>) {
    setError("");
    const res = await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "تعذّر التنفيذ");
      return;
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التقييم؟")) return;
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) setError("تعذّر الحذف");
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">التقييمات</h1>

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}
      {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className={`card p-4 ${r.isFeatured ? "ring-2 ring-rosegold" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-charcoal">{r.customerName}</p>
                <p className="text-xs text-charcoal/40">{r.booking?.service.name}</p>
              </div>
              <span className="text-rosegold">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
            </div>

            {r.comment && <p className="mt-2 text-sm text-charcoal/70">"{r.comment}"</p>}

            {r.imageUrl && (
              <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                <img src={r.imageUrl} alt="صورة التقييم" loading="lazy" className="h-32 w-32 rounded-xl object-cover" />
              </a>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  r.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.isApproved ? "منشور" : "بانتظار المراجعة"}
              </span>
              {r.isFeatured && <span className="rounded-full bg-blush px-2 py-0.5 text-xs font-bold text-wine">⭐ مميّز</span>}

              <div className="mr-auto flex flex-wrap gap-2">
                {!r.isApproved && (
                  <button onClick={() => patch(r.id, { isApproved: true })} className="btn-primary !py-1.5 text-xs">
                    نشر
                  </button>
                )}
                {r.isApproved && (
                  <button
                    onClick={() => patch(r.id, { isFeatured: !r.isFeatured })}
                    className="rounded-full border-2 border-wine/40 px-4 py-1.5 text-xs font-bold text-wine"
                  >
                    {r.isFeatured ? "إلغاء التمييز" : "⭐ تمييز"}
                  </button>
                )}
                {r.isApproved && (
                  <button
                    onClick={() => patch(r.id, { isApproved: false })}
                    className="rounded-full border-2 border-charcoal/20 px-4 py-1.5 text-xs font-bold text-charcoal/50"
                  >
                    إخفاء
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-full border-2 border-red-300 px-4 py-1.5 text-xs font-bold text-red-500"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && reviews.length === 0 && <p className="text-charcoal/50">لا توجد تقييمات بعد</p>}
      </div>
    </div>
  );
}
