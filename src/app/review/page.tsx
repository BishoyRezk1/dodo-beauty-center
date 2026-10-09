"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ReviewForm() {
  const searchParams = useSearchParams();
  const [bookingNumber, setBookingNumber] = useState(searchParams.get("booking") || "");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bookingNumber", bookingNumber.trim());
        const up = await fetch("/api/reviews/upload", { method: "POST", body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "فشل رفع الصورة");
        imageUrl = upData.url;
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber: bookingNumber.trim(), rating, comment: comment || undefined, imageUrl })
      });
      const data = await res.json().catch(() => ({}));
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
        <input value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value)} className="input-field" dir="ltr" required />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-charcoal/70">تقييمك</label>
        <div className="flex gap-2 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-rosegold" : "text-charcoal/20"}>
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-charcoal/70">تعليقك (اختياري)</label>
        <textarea
          value={comment}
          maxLength={600}
          onChange={(e) => setComment(e.target.value)}
          className="input-field min-h-24"
          placeholder="شاركينا رأيك في تجربتك..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-charcoal/70">صورة من شغلك (اختياري)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {preview ? (
          <div className="flex items-center gap-3">
            <img src={preview} alt="معاينة" className="h-24 w-24 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-sm font-bold text-red-600"
            >
              إزالة الصورة
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary !py-2">
            📷 إضافة صورة
          </button>
        )}
        <p className="mt-1 text-xs text-charcoal/50">JPG أو PNG أو WEBP، حتى 5 ميجا.</p>
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
        <p className="mb-6 text-center text-charcoal/60">نسعد جدًا برأيك في زيارتك لـ Zina Nails</p>
        <Suspense fallback={<div className="text-center text-charcoal/50">جاري التحميل...</div>}>
          <ReviewForm />
        </Suspense>
      </div>
    </div>
  );
}
