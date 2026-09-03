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
  couponCode: z.string().optional(),
  offerId: z.string().optional()
});

// POST /api/bookings — public: submit a new booking request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return NextResponse.json({ error: firstError || "بيانات غير صحيحة" }, { status: 400 });
  }
  const { name, phone, serviceId, date, time, notes, screenshotUrl, couponCode, offerId } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (
    !service ||
    !service.isActive ||
    service.status !== "AVAILABLE" ||
    Number(service.price) <= 0
  ) {
    return NextResponse.json(
      { error: "الخدمة غير متاحة للحجز حاليًا" },
      { status: 404 }
    );
  }

  // Re-validate the min/max advance-booking window server-side — never
  // trust that the browser's slot list is still accurate by the time the
  // request arrives.
  const bookingDateTime = new Date(`${date}T${time}:00`);
  const now = new Date();
  const minAdvanceHours = parseFloat(await getSetting(SETTING_KEYS.MIN_ADVANCE_HOURS)) || 0;
  const maxAdvanceDays = parseInt(await getSetting(SETTING_KEYS.MAX_ADVANCE_DAYS), 10) || 60;
  const earliestAllowed = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
  const maxAllowed = new Date(new Date(now.toDateString()).getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
  if (bookingDateTime < earliestAllowed) {
    return NextResponse.json(
      { error: "برجاء اختيار موعد أبعد قليلاً — الحجز يحتاج وقتًا كافيًا للتجهيز." },
      { status: 400 }
    );
  }
  if (bookingDateTime > maxAllowed) {
    return NextResponse.json(
      { error: `الحجز متاح حتى ${maxAdvanceDays} يومًا مقدمًا فقط.` },
      { status: 400 }
    );
  }

  // Blocked customers can't create new bookings.
  const existingCustomer = await prisma.customer.findUnique({ where: { phone } });
  if (existingCustomer?.isBlocked) {
    return NextResponse.json(
      { error: "لا يمكن إتمام الحجز، برجاء التواصل معنا مباشرة على واتساب." },
      { status: 403 }
    );
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

  // If the customer came from an active offer, price the booking off the
  // offer's discounted price instead of the service's normal price.
  let basePrice = Number(service.discountPrice ?? service.price);
  if (offerId) {
    const nowCheck = new Date();
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    const offerUsable =
      offer &&
      offer.isActive &&
      offer.startDate <= nowCheck &&
      offer.endDate >= nowCheck &&
      (!offer.serviceId || offer.serviceId === serviceId);
    if (offerUsable && offer) {
      basePrice = Number(offer.newPrice);
    }
  }

  let feeAmount = calculateFee(basePrice, feeType, feeValue);
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
      select: { startTime: true, endTime: true, service: { select: { bufferMin: true } } }
    });

    const toMin = (v: string) => {
      const [hh, mm] = v.split(":").map(Number);
      return hh * 60 + mm;
    };
    const overlapCount = overlapping.filter((b) => {
      const bStart = toMin(b.startTime);
      const bEnd = toMin(b.endTime) + (b.service?.bufferMin || 0);
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
    feeAmount,
    screenshotUrl
  });
  sendWhatsAppMessage(shopNumber, message).catch(() => {});

  return NextResponse.json(
    { bookingNumber: booking.bookingNumber, status: booking.status },
    { status: 201 }
  );
}
