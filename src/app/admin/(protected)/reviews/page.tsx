"use client";

import { useEffect, useState } from "react";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  booking: { service: { name: string } };
}

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reviews?all=1");
    setReviews(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setApproved(id: string, isApproved: boolean) {
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved })
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا التقييم؟")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">التقييمات</h1>

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-charcoal">{r.customerName}</p>
                <p className="text-xs text-charcoal/40">{r.booking.service.name}</p>
              </div>
              <span className="text-rosegold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-charcoal/70">"{r.comment}"</p>}
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  r.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.isApproved ? "منشور" : "بانتظار المراجعة"}
              </span>
              <div className="mr-auto flex gap-2">
                {!r.isApproved && (
                  <button onClick={() => setApproved(r.id, true)} className="btn-primary !py-1.5 text-xs">
                    نشر
                  </button>
                )}
                {r.isApproved && (
                  <button
                    onClick={() => setApproved(r.id, false)}
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
