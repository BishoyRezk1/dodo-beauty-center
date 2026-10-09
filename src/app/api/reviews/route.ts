import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPushToAdmins } from "@/lib/push";
import { isAllowedImageUrl } from "@/lib/chat";
import { z } from "zod";

// GET /api/reviews — public: approved only (featured first). ?all=1 (admin) returns everything.
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
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 20
  });
  return NextResponse.json(reviews);
}

const schema = z.object({
  bookingNumber: z.string().trim().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
  imageUrl: z.string().max(1000).optional()
});

// POST /api/reviews — public: customer submits a review using their booking number.
// Only allowed once per booking, and only for COMPLETED bookings.
export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`review:${getClientIp(req)}`, 8, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "محاولات كتيرة، حاولي بعد شوية." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { bookingNumber, rating, comment, imageUrl } = parsed.data;

  if (imageUrl && (!isAllowedImageUrl(imageUrl) || !imageUrl.includes("/review-photos/"))) {
    return NextResponse.json({ error: "رابط الصورة غير مسموح" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
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

  let review;
  try {
    review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerName: booking.customer.name,
        rating,
        comment: comment || null,
        imageUrl: imageUrl || null,
        isApproved: false
      }
    });
  } catch {
    return NextResponse.json({ error: "تم إرسال تقييم لهذا الحجز من قبل" }, { status: 409 });
  }

  try {
    await sendPushToAdmins({
      title: "⭐ تقييم جديد",
      body: `${booking.customer.name}: ${rating}/5`,
      url: "/admin/reviews"
    });
  } catch {}

  return NextResponse.json({ ok: true, id: review.id }, { status: 201 });
}
