import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateBookingNumber } from "@/lib/booking-number";
import { getSetting, SETTING_KEYS, calculateFee } from "@/lib/settings";
import { sendWhatsAppMessage, newBookingAdminMessage } from "@/lib/whatsapp";
import { formatArabicDate } from "@/lib/utils";
import { z } from "zod";

// GET /api/bookings — admin: list bookings with optional filters
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const status = req.nextUrl.searchParams.get("status");
  const bookings = await prisma.booking.findMany({
    where: status ? { status: status as any } : {},
    include: { customer: true, service: true, payment: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(bookings);
}

const bookingSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  serviceId: z.string(),
  date: z.string(),
  time: z.string(),
  notes: z.string().optional(),
  screenshotUrl: z.string().min(1, "صورة إثبات التحويل مطلوبة"),
  couponCode: z.string().optional()
});

// POST /api/bookings — public: submit a new booking request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return NextResponse.json({ error: firstError || "بيانات غير صحيحة" }, { status: 400 });
  }
  const { name, phone, serviceId, date, time, notes, screenshotUrl, couponCode } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: "الخدمة غير متاحة" }, { status: 404 });
  }

  // Re-validate the coupon server-side (never trust a client-supplied discount).
  let appliedCoupon: { id: string; code: string; discountPercent: number } | null = null;
  if (couponCode) {
    const code = couponCode.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    const now = new Date();
    const usable =
      coupon &&
      coupon.isActive &&
      (!coupon.expiresAt || coupon.expiresAt >= now) &&
      (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
      (!coupon.serviceId || coupon.serviceId === serviceId);
    if (usable && coupon) {
      appliedCoupon = { id: coupon.id, code: coupon.code, discountPercent: coupon.discountPercent };
    }
  }

  const bookingDate = new Date(`${date}T00:00:00`);
  const [h, m] = time.split(":").map(Number);
  const startMinutes = h * 60 + m;
  const endMinutes = startMinutes + service.durationMin;
  const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(
    endMinutes % 60
  ).padStart(2, "0")}`;

  const feeType = await getSetting(SETTING_KEYS.FEE_TYPE);
  const feeValue = parseFloat(await getSetting(SETTING_KEYS.FEE_VALUE));
  let feeAmount = calculateFee(Number(service.discountPrice ?? service.price), feeType, feeValue);
  if (appliedCoupon) {
    feeAmount = Math.round(feeAmount * (1 - appliedCoupon.discountPercent / 100) * 100) / 100;
  }
  const maxConcurrent = parseInt(await getSetting(SETTING_KEYS.MAX_CONCURRENT_BOOKINGS), 10) || 1;

  // Re-check slot availability at submission time to prevent double booking
  // from a race between two customers picking the same slot.
  const booking = await prisma.$transaction(async (tx) => {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const overlapping = await tx.booking.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ["PENDING", "CONFIRMED"] }
      },
      select: { startTime: true, endTime: true }
    });

    const toMin = (v: string) => {
      const [hh, mm] = v.split(":").map(Number);
      return hh * 60 + mm;
    };
    const overlapCount = overlapping.filter((b) => {
      const bStart = toMin(b.startTime);
      const bEnd = toMin(b.endTime);
      return startMinutes < bEnd && endMinutes > bStart;
    }).length;

    if (overlapCount >= maxConcurrent) {
      throw new Error("SLOT_TAKEN");
    }

    const customer = await tx.customer.upsert({
      where: { phone },
      update: { name },
      create: { name, phone }
    });

    const bookingNumber = await generateBookingNumber();

    const created = await tx.booking.create({
      data: {
        bookingNumber,
        customerId: customer.id,
        serviceId,
        date: bookingDate,
        startTime: time,
        endTime,
        notes,
        feeAmount,
        couponCode: appliedCoupon?.code,
        discountPercent: appliedCoupon?.discountPercent,
        status: "PENDING",
        payment: {
          create: {
            amount: feeAmount,
            method: "VODAFONE_CASH",
            screenshotUrl,
            verified: false
          }
        }
      },
      include: { service: true, customer: true }
    });

    await tx.notification.create({
      data: {
        title: "حجز جديد",
        body: `${customer.name} حجزت ${created.service.name} — ${bookingNumber}`,
        type: "BOOKING",
        bookingId: created.id
      }
    });

    if (appliedCoupon) {
      await tx.coupon.update({
        where: { id: appliedCoupon.id },
        data: { usedCount: { increment: 1 } }
      });
    }

    return created;
  }).catch((err) => {
    if (err.message === "SLOT_TAKEN") return null;
    throw err;
  });

  if (!booking) {
    return NextResponse.json(
      { error: "عذرًا، تم حجز هذا الموعد للتو. برجاء اختيار موعد آخر." },
      { status: 409 }
    );
  }

  // Best-effort WhatsApp notification to the shop — never blocks the
  // response if it fails, since the booking itself already succeeded.
  const shopNumber = await getSetting(SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER);
  const message = newBookingAdminMessage({
    bookingNumber: booking.bookingNumber,
    customerName: name,
    customerPhone: phone,
    serviceName: booking.service.name,
    dateLabel: formatArabicDate(bookingDate),
    timeLabel: time,
    feeAmount
  });
  sendWhatsAppMessage(shopNumber, message).catch(() => {});

  return NextResponse.json(
    { bookingNumber: booking.bookingNumber, status: booking.status },
    { status: 201 }
  );
}
