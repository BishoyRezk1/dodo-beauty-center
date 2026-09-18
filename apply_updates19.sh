#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

mkdir -p src/app/api/auth/facebook/callback
mkdir -p src/app/api/auth/facebook/me
mkdir -p src/app/api/auth/facebook/logout

python - <<'PY'
from pathlib import Path

# 1) مكتبة الفيسبوك (منفصلة تمامًا عن نظام دخول الإدارة)
Path('src/lib/facebook-auth.ts').write_text('''import crypto from "crypto";

const COOKIE_NAME = "fb_review_session";
const SESSION_TTL_MS = 60 * 60 * 1000; // ساعة واحدة، تكفي للتسجيل وكتابة التقييم

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function buildFacebookAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "public_profile",
    response_type: "code"
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || "فشل تسجيل الدخول بالفيسبوك");
  }
  return data.access_token as string;
}

export async function getFacebookProfile(accessToken: string): Promise<{ id: string; name: string }> {
  const params = new URLSearchParams({ fields: "id,name", access_token: accessToken });
  const res = await fetch(`https://graph.facebook.com/me?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error("تعذر جلب بيانات حساب الفيسبوك");
  }
  return { id: data.id as string, name: (data.name as string) || "عميل فيسبوك" };
}

export function createSessionToken(fbId: string, name: string): string {
  const payload = JSON.stringify({ id: fbId, name, exp: Date.now() + SESSION_TTL_MS });
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): { id: string; name: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { id: payload.id, name: payload.name };
  } catch {
    return null;
  }
}

export const FB_COOKIE_NAME = COOKIE_NAME;
export const FB_SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
''', encoding='utf-8')
print('src/lib/facebook-auth.ts: تم الإنشاء')

# 2) بداية تسجيل الدخول
Path('src/app/api/auth/facebook/route.ts').write_text('''import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildFacebookAuthUrl } from "@/lib/facebook-auth";

// GET /api/auth/facebook — بداية تسجيل دخول العميل بالفيسبوك (لكتابة تقييم بس،
// منفصل تمامًا عن نظام دخول لوحة الإدارة).
export async function GET(req: NextRequest) {
  const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = buildFacebookAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });
  return res;
}
''', encoding='utf-8')
print('src/app/api/auth/facebook/route.ts: تم الإنشاء')

# 3) الـ callback بعد رجوع فيسبوك
Path('src/app/api/auth/facebook/callback/route.ts').write_text('''import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForAccessToken,
  getFacebookProfile,
  createSessionToken,
  FB_COOKIE_NAME,
  FB_SESSION_TTL_SECONDS
} from "@/lib/facebook-auth";

// GET /api/auth/facebook/callback — فيسبوك بيرجع هنا بعد ما العميل يسجل دخول.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("fb_oauth_state")?.value;

  const reviewUrl = new URL("/review", req.nextUrl.origin);

  if (!code || !state || !savedState || state !== savedState) {
    reviewUrl.searchParams.set("fb_error", "1");
    return NextResponse.redirect(reviewUrl);
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;
    const accessToken = await exchangeCodeForAccessToken(code, redirectUri);
    const profile = await getFacebookProfile(accessToken);
    const sessionToken = createSessionToken(profile.id, profile.name);

    const res = NextResponse.redirect(reviewUrl);
    res.cookies.set(FB_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: FB_SESSION_TTL_SECONDS,
      path: "/"
    });
    res.cookies.set("fb_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch {
    reviewUrl.searchParams.set("fb_error", "1");
    return NextResponse.redirect(reviewUrl);
  }
}
''', encoding='utf-8')
print('src/app/api/auth/facebook/callback/route.ts: تم الإنشاء')

# 4) التأكد من حالة الدخول
Path('src/app/api/auth/facebook/me/route.ts').write_text('''import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, FB_COOKIE_NAME } from "@/lib/facebook-auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(FB_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ loggedIn: false });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ loggedIn: false });

  return NextResponse.json({ loggedIn: true, name: session.name });
}
''', encoding='utf-8')
print('src/app/api/auth/facebook/me/route.ts: تم الإنشاء')

# 5) تسجيل الخروج (اختياري بس مفيد)
Path('src/app/api/auth/facebook/logout/route.ts').write_text('''import { NextResponse } from "next/server";
import { FB_COOKIE_NAME } from "@/lib/facebook-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FB_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
''', encoding='utf-8')
print('src/app/api/auth/facebook/logout/route.ts: تم الإنشاء')

# 6) تعديل Prisma Schema — رقم الحجز يبقى اختياري + حقل معرف الفيسبوك
p = Path('prisma/schema.prisma')
t = p.read_text(encoding='utf-8')

old_model = '''model Review {
  id           String   @id @default(cuid())
  bookingId    String   @unique
  booking      Booking  @relation(fields: [bookingId], references: [id])
  customerName String
  rating       Int // 1-5
  comment      String?
  isApproved   Boolean  @default(false)
  createdAt    DateTime @default(now())
}'''

new_model = '''model Review {
  id           String   @id @default(cuid())
  bookingId    String?  @unique
  booking      Booking? @relation(fields: [bookingId], references: [id])
  facebookId   String?  @unique
  customerName String
  rating       Int // 1-5
  comment      String?
  isApproved   Boolean  @default(false)
  createdAt    DateTime @default(now())
}'''

if old_model in t:
    t = t.replace(old_model, new_model, 1)
    p.write_text(t, encoding='utf-8')
    print('schema.prisma: تم تحديث موديل Review')
else:
    print('تحذير - schema.prisma مش لاقي موديل Review زي المتوقع')

# 7) تعديل POST /api/reviews — تسجيل فيسبوك بدل رقم الحجز
p = Path('src/app/api/reviews/route.ts')
t = p.read_text(encoding='utf-8')

old_content = '''import { NextRequest, NextResponse } from "next/server";
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
}'''

new_content = '''import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { verifySessionToken, FB_COOKIE_NAME } from "@/lib/facebook-auth";
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
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional()
});

// POST /api/reviews — public: customer submits a review after logging in with
// Facebook (see /api/auth/facebook). One review per Facebook account.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(FB_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "برجاء تسجيل الدخول بالفيسبوك أولاً" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const existing = await prisma.review.findUnique({ where: { facebookId: session.id } });
  if (existing) {
    return NextResponse.json({ error: "تم إرسال تقييم من هذا الحساب من قبل" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      facebookId: session.id,
      customerName: session.name,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      isApproved: false
    }
  });

  return NextResponse.json({ ok: true, id: review.id }, { status: 201 });
}'''

if old_content in t:
    p.write_text(new_content, encoding='utf-8')
    print('api/reviews/route.ts: تم التحديث')
else:
    print('تحذير - api/reviews/route.ts مش لاقي النص المتوقع')

# 8) صفحة التقييم — تسجيل بالفيسبوك بدل رقم الحجز
review_page = '''"use client";
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
'''
Path('src/app/review/page.tsx').write_text(review_page, encoding='utf-8')
print('src/app/review/page.tsx: تم التحديث')

# 9) ضيف لينك "اكتبي رأيك" في قسم آراء العملاء
p = Path('src/components/site/ReviewsSection.tsx')
t = p.read_text(encoding='utf-8')

old_end = '''        ))}
      </div>
    </section>
  );
}'''
new_end = '''        ))}
      </div>
      <div className="mt-8 text-center">
        <a href="/review" className="btn-secondary inline-block">
          اكتبي رأيك
        </a>
      </div>
    </section>
  );
}'''

if old_end in t:
    t = t.replace(old_end, new_end, 1)
    p.write_text(t, encoding='utf-8')
    print('ReviewsSection.tsx: تم إضافة لينك اكتبي رأيك')
else:
    print('تحذير - ReviewsSection.tsx مش لاقي النص المتوقع')
PY

echo "تم بناء نظام تسجيل الدخول بالفيسبوك للتقييمات"
