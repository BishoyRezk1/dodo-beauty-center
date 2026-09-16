import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { generateBookingNumber } from "@/lib/booking-number";
import { getSetting, SETTING_KEYS, calculateFee } from "@/lib/settings";
import { sendWhatsAppMessage, newBookingAdminMessage } from "@/lib/whatsapp";
import { formatArabicDate } from "@/lib/utils";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

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

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

// GET /api/bookings — admin: list bookings with optional filters
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const status = req.nextUrl.searchParams.get("status");

  const bookings = await prisma.booking.findMany({
    where: status ? { status: status as any } : {},
    include: {
      customer: true,
      service: true,
      payment: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json(bookings);
}

const bookingSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  serviceId: z.string().min(1, "الخدمة مطلوبة"),
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "التاريخ غير صالح"
  ),
  time: z.string().regex(
    /^\d{2}:\d{2}$/,
    "الوقت غير صالح"
  ),
  notes: z.string().optional(),
  screenshotUrl: z.string().min(1, "صورة إثبات التحويل مطلوبة"),
  couponCode: z.string().optional(),
  offerId: z.string().optional()
});

// POST /api/bookings — public: submit a new booking request
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`bookings:${ip}`, 5, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "محاولات كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();

    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];

      return NextResponse.json(
        {
          error: firstError || "بيانات غير صحيحة"
        },
        {
          status: 400
        }
      );
    }

    const {
      name,
      phone,
      serviceId,
      date,
      time,
      notes,
      screenshotUrl,
      couponCode,
      offerId
    } = parsed.data;

    if (!isValidTime(time)) {
      return NextResponse.json(
        {
          error: "الوقت المحدد غير صالح."
        },
        {
          status: 400
        }
      );
    }

    const bookingDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        {
          error: "التاريخ المحدد غير صالح."
        },
        {
          status: 400
        }
      );
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId
      }
    });

    if (
      !service ||
      !service.isActive ||
      service.status !== "AVAILABLE" ||
      Number(service.price) <= 0
    ) {
      return NextResponse.json(
        {
          error: "الخدمة غير متاحة للحجز حاليًا."
        },
        {
          status: 404
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 1. Validate booking advance window
     * ---------------------------------------------------------
     */

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

    const bookingDateTime = new Date(
      `${date}T${time}:00`
    );

    if (Number.isNaN(bookingDateTime.getTime())) {
      return NextResponse.json(
        {
          error: "موعد الحجز غير صالح."
        },
        {
          status: 400
        }
      );
    }

    const earliestAllowed = new Date(
      now.getTime() +
        minAdvanceHours * 60 * 60 * 1000
    );

    const todayStart = new Date(
      now.toDateString()
    );

    const maxAllowed = new Date(
      todayStart.getTime() +
        maxAdvanceDays * 24 * 60 * 60 * 1000
    );

    if (bookingDateTime < earliestAllowed) {
      return NextResponse.json(
        {
          error:
            "برجاء اختيار موعد أبعد قليلاً — الحجز يحتاج وقتًا كافيًا للتجهيز."
        },
        {
          status: 400
        }
      );
    }

    if (bookingDateTime > maxAllowed) {
      return NextResponse.json(
        {
          error: `الحجز متاح حتى ${maxAdvanceDays} يومًا مقدمًا فقط.`
        },
        {
          status: 400
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. Blocked customer validation
     * ---------------------------------------------------------
     */

    const existingCustomer = await prisma.customer.findUnique({
      where: {
        phone
      }
    });

    if (existingCustomer?.isBlocked) {
      return NextResponse.json(
        {
          error:
            "لا يمكن إتمام الحجز، برجاء التواصل معنا مباشرة على واتساب."
        },
        {
          status: 403
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. Holiday / ClosedDate validation
     * ---------------------------------------------------------
     */

    const closedDate = await prisma.closedDate.findUnique({
      where: {
        date: bookingDate
      }
    });

    if (closedDate) {
      return NextResponse.json(
        {
          error: closedDate.reason
            ? `هذا اليوم إجازة: ${closedDate.reason}`
            : "هذا اليوم إجازة ولا يمكن الحجز فيه."
        },
        {
          status: 400
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 4. Working hours
     *
     * SpecialWorkingHours has priority over weekly hours.
     * ---------------------------------------------------------
     */

    const dayOfWeek = bookingDate.getDay();

    const special =
      await prisma.specialWorkingHours.findUnique({
        where: {
          date: bookingDate
        }
      });

    let isOpen: boolean;
    let startTime: string;
    let endTime: string;
    let breakStart: string | null;
    let breakEnd: string | null;

    if (special) {
      isOpen = special.isOpen;
      startTime = special.startTime;
      endTime = special.endTime;
      breakStart = special.breakStart;
      breakEnd = special.breakEnd;
    } else {
      const workingHours =
        await prisma.workingHours.findUnique({
          where: {
            dayOfWeek
          }
        });

      if (!workingHours) {
        return NextResponse.json(
          {
            error:
              "لا توجد ساعات عمل محددة لهذا اليوم."
          },
          {
            status: 400
          }
        );
      }

      isOpen = workingHours.isOpen;
      startTime = workingHours.startTime;
      endTime = workingHours.endTime;
      breakStart = workingHours.breakStart;
      breakEnd = workingHours.breakEnd;
    }

    if (!isOpen) {
      return NextResponse.json(
        {
          error: special?.reason
            ? `المحل مغلق: ${special.reason}`
            : "المحل مغلق في هذا اليوم."
        },
        {
          status: 400
        }
      );
    }

    if (
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      return NextResponse.json(
        {
          error: "ساعات العمل غير صحيحة."
        },
        {
          status: 400
        }
      );
    }

    const workingStart = toMinutes(startTime);
    const workingEnd = toMinutes(endTime);

    if (workingStart >= workingEnd) {
      return NextResponse.json(
        {
          error: "ساعات العمل غير صحيحة."
        },
        {
          status: 400
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 5. Break validation
     * ---------------------------------------------------------
     */

    let normalizedBreakStart: number | null = null;
    let normalizedBreakEnd: number | null = null;

    if (breakStart || breakEnd) {
      if (
        !breakStart ||
        !breakEnd ||
        !isValidTime(breakStart) ||
        !isValidTime(breakEnd)
      ) {
        return NextResponse.json(
          {
            error: "فترة الراحة غير صحيحة في إعدادات ساعات العمل."
          },
          {
            status: 400
          }
        );
      }

      normalizedBreakStart =
        toMinutes(breakStart);

      normalizedBreakEnd =
        toMinutes(breakEnd);

      if (
        normalizedBreakStart >=
        normalizedBreakEnd
      ) {
        return NextResponse.json(
          {
            error: "فترة الراحة غير صحيحة."
          },
          {
            status: 400
          }
        );
      }

      if (
        normalizedBreakStart < workingStart ||
        normalizedBreakEnd > workingEnd
      ) {
        return NextResponse.json(
          {
            error:
              "فترة الراحة يجب أن تكون داخل ساعات العمل."
          },
          {
            status: 400
          }
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * 6. Calculate appointment duration
     * ---------------------------------------------------------
     */

    const startMinutes = toMinutes(time);

    const duration = service.durationMin;
    const bufferMin = service.bufferMin || 0;

    const endMinutes =
      startMinutes + duration;

    const occupiedEndMinutes =
      endMinutes + bufferMin;

    const calculatedEndTime = formatTime(endMinutes);

    /*
     * Appointment must fit completely inside working hours,
     * including service buffer.
     */

    if (
      startMinutes < workingStart ||
      occupiedEndMinutes > workingEnd
    ) {
      return NextResponse.json(
        {
          error:
            `الموعد خارج ساعات العمل. ساعات العمل من ${startTime} إلى ${endTime}.`
        },
        {
          status: 400
        }
      );
    }

    /*
     * Appointment cannot overlap the break.
     */

    if (
      normalizedBreakStart !== null &&
      normalizedBreakEnd !== null &&
      startMinutes < normalizedBreakEnd &&
      endMinutes > normalizedBreakStart
    ) {
      return NextResponse.json(
        {
          error: "الموعد يتعارض مع فترة الراحة."
        },
        {
          status: 400
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 7. Coupon validation
     *
     * Existing functionality preserved.
     * No new coupon functionality added.
     * ---------------------------------------------------------
     */

    let appliedCoupon: {
      id: string;
      code: string;
      discountPercent: number;
    } | null = null;

    if (couponCode) {
      const code =
        couponCode.toUpperCase().trim();

      const coupon =
        await prisma.coupon.findUnique({
          where: {
            code
          }
        });

      const currentTime = new Date();

      const usable =
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt ||
          coupon.expiresAt >= currentTime) &&
        (coupon.maxUses === null ||
          coupon.usedCount < coupon.maxUses) &&
        (!coupon.serviceId ||
          coupon.serviceId === serviceId);

      if (usable && coupon) {
        appliedCoupon = {
          id: coupon.id,
          code: coupon.code,
          discountPercent:
            coupon.discountPercent
        };
      }
    }

    /*
     * ---------------------------------------------------------
     * 8. Existing offer pricing
     *
     * Existing functionality preserved.
     * ---------------------------------------------------------
     */

    let basePrice = Number(
      service.discountPrice ??
        service.price
    );

    if (offerId) {
      const currentTime = new Date();

      const offer =
        await prisma.offer.findUnique({
          where: {
            id: offerId
          }
        });

      const offerUsable =
        offer &&
        offer.isActive &&
        offer.startDate <= currentTime &&
        offer.endDate >= currentTime &&
        (!offer.serviceId ||
          offer.serviceId === serviceId);

      if (offerUsable && offer) {
        basePrice = Number(
          offer.newPrice
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * 9. Calculate booking fee
     * ---------------------------------------------------------
     */

    const feeType =
      await getSetting(
        SETTING_KEYS.FEE_TYPE
      );

    const feeValue =
      parseFloat(
        await getSetting(
          SETTING_KEYS.FEE_VALUE
        )
      );

    let feeAmount = calculateFee(
      basePrice,
      feeType,
      feeValue
    );

    if (appliedCoupon) {
      feeAmount =
        Math.round(
          feeAmount *
            (1 -
              appliedCoupon.discountPercent /
                100) *
            100
        ) / 100;
    }

    const maxConcurrent =
      parseInt(
        await getSetting(
          SETTING_KEYS.MAX_CONCURRENT_BOOKINGS
        ),
        10
      ) || 1;

    /*
     * ---------------------------------------------------------
     * 10. Atomic booking creation
     *
     * Advisory lock protects the same date from concurrent
     * booking requests.
     *
     * Back-to-back appointments are allowed:
     * previous end === new start.
     * ---------------------------------------------------------
     */

    const booking =
      await prisma.$transaction(
        async (tx) => {
          /*
           * PostgreSQL transaction-level advisory lock.
           * The lock is automatically released when this
           * transaction finishes.
           */
          await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(
              hashtextextended(${date}, 0)
            )
          `;

          const dayStart =
            new Date(`${date}T00:00:00`);

          const dayEnd =
            new Date(`${date}T23:59:59`);

          const overlapping =
            await tx.booking.findMany({
              where: {
                date: {
                  gte: dayStart,
                  lte: dayEnd
                },
                status: {
                  in: [
                    "PENDING",
                    "CONFIRMED"
                  ]
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
            overlapping.filter(
              (existingBooking) => {
                const existingStart =
                  toMinutes(
                    existingBooking.startTime
                  );

                const existingEnd =
                  toMinutes(
                    existingBooking.endTime
                  ) +
                  (existingBooking.service
                    ?.bufferMin || 0);

                /*
                 * Strict overlap:
                 *
                 * new start < old end
                 * AND
                 * new end > old start
                 *
                 * Therefore:
                 * old end === new start
                 * is allowed.
                 */
                return (
                  startMinutes <
                    existingEnd &&
                  endMinutes >
                    existingStart
                );
              }
            ).length;

          if (
            overlapCount >=
            maxConcurrent
          ) {
            throw new Error(
              "SLOT_TAKEN"
            );
          }

          const customer =
            await tx.customer.upsert({
              where: {
                phone
              },
              update: {
                name
              },
              create: {
                name,
                phone
              }
            });

          const bookingNumber =
            await generateBookingNumber();

          const created =
            await tx.booking.create({
              data: {
                bookingNumber,
                customerId:
                  customer.id,
                serviceId,
                date: bookingDate,
                startTime: time,
                endTime,
                notes,
                feeAmount,
                couponCode:
                  appliedCoupon?.code,
                discountPercent:
                  appliedCoupon?.discountPercent,
                status: "PENDING",

                payment: {
                  create: {
                    amount:
                      feeAmount,
                    method:
                      "VODAFONE_CASH",
                    screenshotUrl,
                    verified:
                      false
                  }
                }
              },
              include: {
                service: true,
                customer: true
              }
            });

          await tx.notification.create({
            data: {
              title:
                "حجز جديد",
              body: `${customer.name} حجزت ${created.service.name} — ${bookingNumber}`,
              type:
                "BOOKING",
              bookingId:
                created.id
            }
          });

          if (appliedCoupon) {
            await tx.coupon.update({
              where: {
                id: appliedCoupon.id
              },
              data: {
                usedCount: {
                  increment: 1
                }
              }
            });
          }

          return created;
        },
        {
          isolationLevel:
            "Serializable"
        }
      ).catch((error) => {
        if (
          error instanceof Error &&
          error.message === "SLOT_TAKEN"
        ) {
          return null;
        }

        /*
         * Prisma serialization conflict.
         * Returning null makes the customer choose
         * another slot instead of creating a duplicate.
         */
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2034"
        ) {
          return null;
        }

        throw error;
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "عذرًا، تم حجز هذا الموعد للتو. برجاء اختيار موعد آخر."
        },
        {
          status: 409
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 11. Existing WhatsApp notification
     *
     * Preserved only. It never blocks booking response.
     * ---------------------------------------------------------
     */

    const shopNumber =
      await getSetting(
        SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER
      );

    const message =
      newBookingAdminMessage({
        bookingNumber:
          booking.bookingNumber,
        customerName:
          name,
        customerPhone:
          phone,
        serviceName:
          booking.service.name,
        dateLabel:
          formatArabicDate(
            bookingDate
          ),
        timeLabel:
          time,
        feeAmount,
        screenshotUrl
      });

    sendWhatsAppMessage(
      shopNumber,
      message
    ).catch(() => {});

    /*
     * ---------------------------------------------------------
     * 12. Final response
     * ---------------------------------------------------------
     */

    return NextResponse.json(
      {
        bookingNumber:
          booking.bookingNumber,
        status:
          booking.status,
        service: {
          name:
            booking.service.name,
          durationMin:
            service.durationMin
        },
        appointment: {
          date,
          startTime: time,
          endTime
        }
      },
      {
        status: 201
      }
    );
  } catch (error) {
    console.error(
      "Create booking error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "تعذر إنشاء الحجز حاليًا. برجاء المحاولة مرة أخرى."
      },
      {
        status: 500
      }
    );
  }
}
