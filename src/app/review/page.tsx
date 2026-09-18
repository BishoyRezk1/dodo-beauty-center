"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function ReviewForm() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/auth/facebook/me")
      .then((r) => r.json())
      .then((data) => {
        setLoggedIn(Boolean(data.loggedIn));
        setName(data.name || "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined })
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

  if (loading) {
    return <div className="text-center text-charcoal/50">جاري التحميل...</div>;
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

  if (!loggedIn) {
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-charcoal/70">سجّلي دخول بحساب الفيسبوك عشان تقدري تكتبي رأيك</p>
        <a
          href="/api/auth/facebook"
          className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-5 py-3 font-bold text-white transition hover:opacity-90"
        >
          سجّلي دخول بالفيسبوك
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-6">
      <p className="text-sm text-charcoal/60">
        مسجّلة الدخول باسم: <span className="font-bold text-charcoal">{name}</span>
      </p>

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

      <button type="submit" disabled={submitting} className="btn-primary">
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
        <p className="mb-6 text-center text-charcoal/60">نسعد جدًا برأيك في زيارتك لـ Zina Nails</p>
        <ReviewForm />
      </div>
    </div>
  );
}
