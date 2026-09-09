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
import { getSetting, SETTING_KEYS } from "@/lib/settings";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const TIME_REGEX = /^\d{2}:\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(value: string): boolean {
  if (!TIME_REGEX.test(value)) return false;

  const [hours, minutes] = value.split(":").map(Number);

  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function datesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        service: true,
        payment: true,
        review: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: "الحجز غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Booking GET error:", error);

    return NextResponse.json(
      { error: "تعذر تحميل بيانات الحجز" },
      { status: 500 }
    );
  }
}

const updateSchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "CONFIRMED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED"
      ])
      .optional(),

    date: z.string().optional(),

    startTime: z.string().optional(),

    endTime: z.string().optional(),

    serviceId: z.string().optional(),

    verifyPayment: z.boolean().optional()
  })
  .refine(
    (data) =>
      data.date !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined ||
      data.serviceId !== undefined ||
      data.status !== undefined ||
      data.verifyPayment !== undefined,
    {
      message: "لا توجد بيانات للتعديل"
    }
  );

// PATCH /api/bookings/:id
// Admin: status / date / time / service / payment verification
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();

    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      status,
      date,
      startTime,
      endTime,
      serviceId,
      verifyPayment
    } = parsed.data;

    const original = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        service: true,
        payment: true
      }
    });

    if (!original) {
      return NextResponse.json(
        { error: "الحجز غير موجود" },
        { status: 404 }
      );
    }

    const changingSchedule =
      date !== undefined ||
      startTime !== undefined ||
      endTime !== undefined ||
      serviceId !== undefined;

    let updatedBooking;

    if (changingSchedule) {
      updatedBooking = await updateScheduleWithValidation({
        bookingId: params.id,
        original,
        date,
        startTime,
        endTime,
        serviceId,
        status
      });
    } else {
      updatedBooking = await prisma.booking.update({
        where: { id: params.id },
        data: {
          ...(status !== undefined ? { status } : {})
        },
        include: {
          customer: true,
          service: true,
          payment: true,
          review: true
        }
      });
    }

    if (verifyPayment !== undefined) {
      if (!updatedBooking.payment) {
        return NextResponse.json(
          {
            error:
              "لا يوجد سجل دفع لهذا الحجز، لذلك لا يمكن تحديث حالة الدفع"
          },
          { status: 400 }
        );
      }

      await prisma.payment.update({
        where: {
          bookingId: updatedBooking.id
        },
        data: {
          verified: verifyPayment,
          verifiedAt: verifyPayment ? new Date() : null
        }
      });

      updatedBooking = await prisma.booking.findUniqueOrThrow({
        where: { id: updatedBooking.id },
        include: {
          customer: true,
          service: true,
          payment: true,
          review: true
        }
      });
    }

    const booking = updatedBooking;

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

      const sent = await sendWhatsAppMessage(
        booking.customer.phone,
        message
      );

      if (!sent) {
        return NextResponse.json({
          booking,
          whatsappLink: buildWhatsAppLink(
            booking.customer.phone,
            message
          )
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

      const message = reviewRequestMessage({
        bookingNumber: booking.bookingNumber,
        reviewUrl
      });

      const sent = await sendWhatsAppMessage(
        booking.customer.phone,
        message
      );

      if (!sent) {
        return NextResponse.json({
          booking,
          whatsappLink: buildWhatsAppLink(
            booking.customer.phone,
            message
          )
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

      const message = bookingRejectedCustomerMessage({
        bookingNumber: booking.bookingNumber
      });

      const sent = await sendWhatsAppMessage(
        booking.customer.phone,
        message
      );

      if (!sent) {
        return NextResponse.json({
          booking,
          whatsappLink: buildWhatsAppLink(
            booking.customer.phone,
            message
          )
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

      const message = bookingCancelledCustomerMessage({
        bookingNumber: booking.bookingNumber
      });

      const sent = await sendWhatsAppMessage(
        booking.customer.phone,
        message
      );

      if (!sent) {
        return NextResponse.json({
          booking,
          whatsappLink: buildWhatsAppLink(
            booking.customer.phone,
            message
          )
        });
      }
    }

    const wasRescheduled =
      changingSchedule &&
      (original.date.getTime() !== booking.date.getTime() ||
        original.startTime !== booking.startTime ||
        original.serviceId !== booking.serviceId);

    if (wasRescheduled) {
      const message = bookingRescheduledCustomerMessage({
        bookingNumber: booking.bookingNumber,
        serviceName: booking.service.name,
        dateLabel: formatArabicDate(booking.date),
        timeLabel: booking.startTime
      });

      const sent = await sendWhatsAppMessage(
        booking.customer.phone,
        message
      );

      if (!sent) {
        return NextResponse.json({
          booking,
          whatsappLink: buildWhatsAppLink(
            booking.customer.phone,
            message
          )
        });
      }
    }

    return NextResponse.json({
      booking
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "حدث تعارض أثناء تعديل الحجز. حاول مرة أخرى."
        },
        { status: 409 }
      );
    }

    console.error("Booking PATCH error:", error);

    return NextResponse.json(
      {
        error: "تعذر تعديل الحجز"
      },
      { status: 500 }
    );
  }
}

async function updateScheduleWithValidation({
  bookingId,
  original,
  date,
  startTime,
  endTime,
  serviceId,
  status
}: {
  bookingId: string;
  original: any;
  date?: string;
  startTime?: string;
  endTime?: string;
  serviceId?: string;
  status?: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
}) {
  const targetDate = date ?? original.date.toISOString().slice(0, 10);

  if (!isValidDate(targetDate)) {
    throw new Error("INVALID_DATE");
  }

  const targetStartTime = startTime ?? original.startTime;

  if (!isValidTime(targetStartTime)) {
    throw new Error("INVALID_START_TIME");
  }

  const targetServiceId = serviceId ?? original.serviceId;

  const service = await prisma.service.findUnique({
    where: {
      id: targetServiceId
    },
    select: {
      id: true,
      name: true,
      durationMin: true,
      bufferMin: true,
      isActive: true,
      status: true
    }
  });

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  if (!service.isActive || service.status !== "AVAILABLE") {
    throw new Error("SERVICE_NOT_AVAILABLE");
  }

  const duration = service.durationMin;
  const bufferMin = service.bufferMin || 0;

  const startMinutes = toMinutes(targetStartTime);
  const calculatedEndMinutes = startMinutes + duration;
  const bookingEndWithBuffer =
    calculatedEndMinutes + bufferMin;

  if (calculatedEndMinutes > 24 * 60) {
    throw new Error("SERVICE_OUTSIDE_DAY");
  }

  const calculatedEndTime =
    minutesToTime(calculatedEndMinutes);

  if (endTime !== undefined && !isValidTime(endTime)) {
    throw new Error("INVALID_END_TIME");
  }

  const targetDateObject = new Date(
    `${targetDate}T00:00:00`
  );

  if (Number.isNaN(targetDateObject.getTime())) {
    throw new Error("INVALID_DATE");
  }

  const closedDate = await prisma.closedDate.findUnique({
    where: {
      date: targetDateObject
    }
  });

  if (closedDate) {
    throw new Error(
      closedDate.reason
        ? `CLOSED_DATE:${closedDate.reason}`
        : "CLOSED_DATE"
    );
  }

  const special =
    await prisma.specialWorkingHours.findUnique({
      where: {
        date: targetDateObject
      }
    });

  let isOpen: boolean;
  let workingStart: string;
  let workingEnd: string;
  let breakStart: string | null;
  let breakEnd: string | null;

  if (special) {
    isOpen = special.isOpen;
    workingStart = special.startTime;
    workingEnd = special.endTime;
    breakStart = special.breakStart;
    breakEnd = special.breakEnd;
  } else {
    const dayOfWeek = targetDateObject.getDay();

    const workingHours =
      await prisma.workingHours.findUnique({
        where: {
          dayOfWeek
        }
      });

    if (!workingHours) {
      throw new Error("NO_WORKING_HOURS");
    }

    isOpen = workingHours.isOpen;
    workingStart = workingHours.startTime;
    workingEnd = workingHours.endTime;
    breakStart = workingHours.breakStart;
    breakEnd = workingHours.breakEnd;
  }

  if (!isOpen) {
    throw new Error(
      special?.reason
        ? `SPECIAL_CLOSED:${special.reason}`
        : "DAY_CLOSED"
    );
  }

  if (
    !isValidTime(workingStart) ||
    !isValidTime(workingEnd)
  ) {
    throw new Error("INVALID_WORKING_HOURS");
  }

  const workStartMinutes = toMinutes(workingStart);
  const workEndMinutes = toMinutes(workingEnd);

  if (workStartMinutes >= workEndMinutes) {
    throw new Error("INVALID_WORKING_HOURS");
  }

  if (
    startMinutes < workStartMinutes ||
    bookingEndWithBuffer > workEndMinutes
  ) {
    throw new Error("OUTSIDE_WORKING_HOURS");
  }

  if (breakStart && breakEnd) {
    if (
      !isValidTime(breakStart) ||
      !isValidTime(breakEnd)
    ) {
      throw new Error("INVALID_BREAK");
    }

    const breakStartMinutes = toMinutes(breakStart);
    const breakEndMinutes = toMinutes(breakEnd);

    if (breakStartMinutes >= breakEndMinutes) {
      throw new Error("INVALID_BREAK");
    }

    if (
      datesOverlap(
        startMinutes,
        calculatedEndMinutes,
        breakStartMinutes,
        breakEndMinutes
      )
    ) {
      throw new Error("BREAK_CONFLICT");
    }
  }

  const now = new Date();

  const minAdvanceHours =
    parseFloat(
      await getSetting(SETTING_KEYS.MIN_ADVANCE_HOURS)
    ) || 0;

  const maxAdvanceDays =
    parseInt(
      await getSetting(SETTING_KEYS.MAX_ADVANCE_DAYS),
      10
    ) || 60;

  const todayStart = new Date(
    now.toDateString()
  );

  const maxDate = new Date(
    todayStart.getTime() +
      maxAdvanceDays * 24 * 60 * 60 * 1000
  );

  if (targetDateObject < todayStart) {
    throw new Error("PAST_DATE");
  }

  if (targetDateObject > maxDate) {
    throw new Error(
      `MAX_ADVANCE:${maxAdvanceDays}`
    );
  }

  const earliestAllowed = new Date(
    now.getTime() +
      minAdvanceHours * 60 * 60 * 1000
  );

  const slotDateTime = new Date(
    targetDateObject.getTime() +
      startMinutes * 60 * 1000
  );

  if (slotDateTime < earliestAllowed) {
    throw new Error("MIN_ADVANCE");
  }

  const dayStart = new Date(
    `${targetDate}T00:00:00`
  );

  const dayEnd = new Date(
    `${targetDate}T23:59:59`
  );

  const maxConcurrent =
    parseInt(
      await getSetting(
        SETTING_KEYS.MAX_CONCURRENT_BOOKINGS
      ),
      10
    ) || 1;

  const result = await prisma.$transaction(
    async (tx) => {
      // Lock the target date so two simultaneous admin/customer
      // updates cannot both pass the availability check.
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${targetDate}, 0)
        )
      `;

      const existingBookings =
        await tx.booking.findMany({
          where: {
            id: {
              not: bookingId
            },
            date: {
              gte: dayStart,
              lte: dayEnd
            },
            status: {
              in: ["PENDING", "CONFIRMED"]
            }
          },
          select: {
            startTime: true,
            endTime: true,
            service: {
              select: {
                bufferMin: true
              }
            }
          }
        });

      const overlapCount =
        existingBookings.filter((booking) => {
          const existingStart =
            toMinutes(booking.startTime);

          const existingEnd =
            toMinutes(booking.endTime) +
            (booking.service?.bufferMin || 0);

          return datesOverlap(
            startMinutes,
            bookingEndWithBuffer,
            existingStart,
            existingEnd
          );
        }).length;

      if (overlapCount >= maxConcurrent) {
        throw new Error("BOOKING_CONFLICT");
      }

      return tx.booking.update({
        where: {
          id: bookingId
        },
        data: {
          date: targetDateObject,
          startTime: targetStartTime,
          endTime: calculatedEndTime,
          serviceId: targetServiceId,
          ...(status !== undefined
            ? { status }
            : {})
        },
        include: {
          customer: true,
          service: true,
          payment: true,
          review: true
        }
      });
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000
    }
  );

  return result;
}
