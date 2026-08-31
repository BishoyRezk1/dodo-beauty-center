import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  buildWhatsAppLink,
  sendWhatsAppMessage,
  bookingConfirmedCustomerMessage,
  bookingRejectedCustomerMessage,
  bookingCancelledCustomerMessage,
  bookingRescheduledCustomerMessage,
  reviewRequestMessage
} from "@/lib/whatsapp";
import { formatArabicDate } from "@/lib/utils";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { customer: true, service: true, payment: true }
  });
  if (!booking) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  return NextResponse.json(booking);
}

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"]).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  verifyPayment: z.boolean().optional()
});

// PATCH /api/bookings/:id — admin: confirm / reject / cancel / reschedule
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { status, date, startTime, endTime, verifyPayment } = parsed.data;

  const original = await prisma.booking.findUnique({ where: { id: params.id } });
  const isReschedule = !!(date || startTime || endTime) && !status;

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(date && { date: new Date(`${date}T00:00:00`) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(verifyPayment !== undefined && {
        payment: { update: { verified: verifyPayment, verifiedAt: verifyPayment ? new Date() : null } }
      })
    },
    include: { customer: true, service: true, payment: true }
  });

  if (status === "CONFIRMED") {
    await prisma.notification.create({
      data: {
        title: "تم تأكيد الحجز",
        body: `${booking.customer.name} — ${booking.bookingNumber}`,
        type: "CONFIRMED",
        bookingId: booking.id
      }
    });
    const message = bookingConfirmedCustomerMessage({
      bookingNumber: booking.bookingNumber,
      serviceName: booking.service.name,
      dateLabel: formatArabicDate(booking.date),
      timeLabel: booking.startTime
    });
    const sent = await sendWhatsAppMessage(booking.customer.phone, message);
    if (!sent) {
      return NextResponse.json({
        booking,
        whatsappLink: buildWhatsAppLink(booking.customer.phone, message)
      });
    }
  }

  if (status === "COMPLETED") {
    await prisma.notification.create({
      data: {
        title: "تم الانتهاء من الخدمة",
        body: `${booking.customer.name} — ${booking.bookingNumber}`,
        type: "COMPLETED",
        bookingId: booking.id
      }
    });
    const reviewUrl = `${req.nextUrl.origin}/review?booking=${booking.bookingNumber}`;
    const message = reviewRequestMessage({ bookingNumber: booking.bookingNumber, reviewUrl });
    const sent = await sendWhatsAppMessage(booking.customer.phone, message);
    if (!sent) {
      return NextResponse.json({
        booking,
        whatsappLink: buildWhatsAppLink(booking.customer.phone, message)
      });
    }
  }

  if (status === "REJECTED") {
    await prisma.notification.create({
      data: {
        title: "تم رفض الحجز",
        body: `${booking.customer.name} — ${booking.bookingNumber}`,
        type: "REJECTED",
        bookingId: booking.id
      }
    });
    const message = bookingRejectedCustomerMessage({ bookingNumber: booking.bookingNumber });
    const sent = await sendWhatsAppMessage(booking.customer.phone, message);
    if (!sent) {
      return NextResponse.json({
        booking,
        whatsappLink: buildWhatsAppLink(booking.customer.phone, message)
      });
    }
  }

  if (status === "CANCELLED") {
    await prisma.notification.create({
      data: {
        title: "تم إلغاء الحجز",
        body: `${booking.customer.name} — ${booking.bookingNumber}`,
        type: "CANCELLED",
        bookingId: booking.id
      }
    });
    const message = bookingCancelledCustomerMessage({ bookingNumber: booking.bookingNumber });
    const sent = await sendWhatsAppMessage(booking.customer.phone, message);
    if (!sent) {
      return NextResponse.json({
        booking,
        whatsappLink: buildWhatsAppLink(booking.customer.phone, message)
      });
    }
  }

  // Reschedule: date/time changed without an explicit status change.
  if (isReschedule && original && (original.date.getTime() !== booking.date.getTime() || original.startTime !== booking.startTime)) {
    const message = bookingRescheduledCustomerMessage({
      bookingNumber: booking.bookingNumber,
      serviceName: booking.service.name,
      dateLabel: formatArabicDate(booking.date),
      timeLabel: booking.startTime
    });
    const sent = await sendWhatsAppMessage(booking.customer.phone, message);
    if (!sent) {
      return NextResponse.json({
        booking,
        whatsappLink: buildWhatsAppLink(booking.customer.phone, message)
      });
    }
  }

  return NextResponse.json({ booking });
}
