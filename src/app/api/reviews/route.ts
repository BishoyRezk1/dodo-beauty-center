import { NextRequest, NextResponse } from "next/server";
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
}