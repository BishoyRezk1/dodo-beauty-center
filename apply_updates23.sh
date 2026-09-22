#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

# 1) رجّع POST /api/reviews لنظام رقم الحجز الأصلي (إلغاء الفيسبوك)
reviews_route = '''import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// GET /api/reviews — public: approved only. ?all=1 (admin) returns everything.
export async function GET(req: NextRequest) {
  const includeAll = req.nextUrl.searchParams.get("all") === "1";
  if (includeAll) {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    const reviews = await prisma.review.findMany({
      include: { booking: { include: { service: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(reviews);
  }

  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return NextResponse.json(reviews);
}

const schema = z.object({
  bookingNumber: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional()
});

// POST /api/reviews — public: customer submits a review using their booking number.
// Only allowed once per booking, and only for COMPLETED bookings.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { bookingNumber: parsed.data.bookingNumber },
    include: { customer: true, review: true }
  });

  if (!booking) {
    return NextResponse.json({ error: "رقم الحجز غير موجود" }, { status: 404 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "التقييم متاح بعد انتهاء الخدمة فقط" }, { status: 400 });
  }
  if (booking.review) {
    return NextResponse.json({ error: "تم إرسال تقييم لهذا الحجز من قبل" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      customerName: booking.customer.name,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      isApproved: false
    }
  });

  return NextResponse.json({ ok: true, id: review.id }, { status: 201 });
}
'''
Path('src/app/api/reviews/route.ts').write_text(reviews_route, encoding='utf-8')
print('api/reviews/route.ts: تم الرجوع لنظام رقم الحجز')

# 2) رجّع صفحة التقييم الأصلية (فورم رقم الحجز)
review_page = '''"use client";

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
        <p className="mb-6 text-center text-charcoal/60">نسعد جدًا برأيك في زيارتك لـ Zina Nails</p>
        <Suspense fallback={<div className="text-center text-charcoal/50">جاري التحميل...</div>}>
          <ReviewForm />
        </Suspense>
      </div>
    </div>
  );
}
'''
Path('src/app/review/page.tsx').write_text(review_page, encoding='utf-8')
print('review/page.tsx: تم الرجوع للنموذج الأصلي')

# 3) تغيير نص الزرار من "اكتبي رأيك" إلى "رأيك يهمنا"
p = Path('src/components/site/ReviewsSection.tsx')
t = p.read_text(encoding='utf-8')
old = 'اكتبي رأيك'
new = 'رأيك يهمنا'
if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('ReviewsSection.tsx: تم تغيير نص الزرار')
else:
    print('تحذير - ReviewsSection.tsx مش لاقي النص المتوقع')
PY

echo "تم الرجوع لنظام التقييم برقم الحجز وتغيير نص الزرار"
