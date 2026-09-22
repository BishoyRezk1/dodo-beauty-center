import { NextRequest, NextResponse } from "next/server";
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
