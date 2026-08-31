"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ReviewForm() {
  const searchParams = useSearchParams();
  const [bookingNumber, setBookingNumber] = useState(searchParams.get("booking") || "");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, rating, comment: comment || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ");
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mb-4 text-5xl">💖</div>
        <h2 className="mb-2 font-display text-2xl font-bold text-charcoal">شكرًا لتقييمك!</h2>
        <p className="text-charcoal/60">سيتم عرض تقييمك على الموقع بعد المراجعة.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-bold text-charcoal/70">رقم الحجز</label>
        <input
          value={bookingNumber}
          onChange={(e) => setBookingNumber(e.target.value)}
          className="input-field"
          dir="ltr"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-charcoal/70">تقييمك</label>
        <div className="flex gap-2 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={n <= rating ? "text-rosegold" : "text-charcoal/20"}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-charcoal/70">تعليقك (اختياري)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input-field min-h-24"
          placeholder="شاركينا رأيك في تجربتك..."
        />
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || !bookingNumber} className="btn-primary">
        {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
      </button>
    </form>
  );
}

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="section-container flex h-16 items-center">
        <Link href="/" className="font-display text-lg font-extrabold text-wine">
          ← الرئيسية
        </Link>
      </div>
      <div className="section-container max-w-lg py-8">
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-charcoal">قيّمي تجربتك</h1>
        <p className="mb-6 text-center text-charcoal/60">نسعد جدًا برأيك في زيارتك لـ DoDo Beauty Center</p>
        <Suspense fallback={<div className="text-center text-charcoal/50">جاري التحميل...</div>}>
          <ReviewForm />
        </Suspense>
      </div>
    </div>
  );
}
