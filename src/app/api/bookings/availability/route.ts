import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

// GET /api/bookings/availability?serviceId=xxx&date=2026-09-15
export async function GET(req: NextRequest) {
  try {
    const serviceId = req.nextUrl.searchParams.get("serviceId");
    const dateStr = req.nextUrl.searchParams.get("date");

    if (!serviceId || !dateStr) {
      return NextResponse.json(
        { error: "serviceId و date مطلوبان" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        price: true,
        durationMin: true,
        bufferMin: true,
        isActive: true,
        status: true
      }
    });

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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "تاريخ غير صالح" },
        { status: 400 }
      );
    }

    const date = new Date(`${dateStr}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "تاريخ غير صالح" },
        { status: 400 }
      );
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

    const todayStart = new Date(now.toDateString());

    if (date < todayStart) {
      return NextResponse.json({
        slots: [],
        reason: "لا يمكن الحجز في تاريخ سابق"
      });
    }

    const maxDate = new Date(
      todayStart.getTime() +
        maxAdvanceDays * 24 * 60 * 60 * 1000
    );

    if (date > maxDate) {
      return NextResponse.json({
        slots: [],
        reason: `الحجز متاح حتى ${maxAdvanceDays} يومًا مقدمًا فقط`
      });
    }

    // Full-day holidays always take priority.
    const closed = await prisma.closedDate.findUnique({
      where: { date }
    });

    if (closed) {
      return NextResponse.json({
        slots: [],
        reason: closed.reason
          ? `هذا اليوم إجازة: ${closed.reason}`
          : "هذا اليوم إجازة"
      });
    }

    const dayOfWeek = date.getDay();

    // A special date overrides the normal weekly working hours.
    const special = await prisma.specialWorkingHours.findUnique({
      where: { date }
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
      const wh = await prisma.workingHours.findUnique({
        where: { dayOfWeek }
      });

      if (!wh) {
        return NextResponse.json({
          slots: [],
          reason: "لا توجد ساعات عمل محددة لهذا اليوم"
        });
      }

      isOpen = wh.isOpen;
      startTime = wh.startTime;
      endTime = wh.endTime;
      breakStart = wh.breakStart;
      breakEnd = wh.breakEnd;
    }

    if (!isOpen) {
      return NextResponse.json({
        slots: [],
        reason: special?.reason
          ? `المحل مغلق: ${special.reason}`
          : "المحل مغلق في هذا اليوم"
      });
    }

    if (
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      return NextResponse.json({
        slots: [],
        reason: "ساعات العمل غير صحيحة"
      });
    }

    const dayStart = toMinutes(startTime);
    const dayEnd = toMinutes(endTime);

    if (dayStart >= dayEnd) {
      return NextResponse.json({
        slots: [],
        reason: "ساعات العمل غير صحيحة"
      });
    }

    const normalizedBreakStart =
      breakStart && isValidTime(breakStart)
        ? toMinutes(breakStart)
        : null;

    const normalizedBreakEnd =
      breakEnd && isValidTime(breakEnd)
        ? toMinutes(breakEnd)
        : null;

    const maxConcurrent =
      parseInt(
        await getSetting(
          SETTING_KEYS.MAX_CONCURRENT_BOOKINGS
        ),
        10
      ) || 1;

    const duration = service.durationMin;
    const bufferMin = service.bufferMin || 0;
    const step = 30;

    const earliestAllowed = new Date(
      now.getTime() +
        minAdvanceHours * 60 * 60 * 1000
    );

    const dayStartDate = new Date(
      `${dateStr}T00:00:00`
    );

    const dayEndDate = new Date(
      `${dateStr}T23:59:59`
    );

    const existing = await prisma.booking.findMany({
      where: {
        date: {
          gte: dayStartDate,
          lte: dayEndDate
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

    const slots: string[] = [];

    for (
      let start = dayStart;
      start + duration + bufferMin <= dayEnd;
      start += step
    ) {
      const end = start + duration;

      // Do not allow an appointment to overlap the break.
      if (
        normalizedBreakStart !== null &&
        normalizedBreakEnd !== null &&
        start < normalizedBreakEnd &&
        end > normalizedBreakStart
      ) {
        continue;
      }

      const slotDateTime = new Date(
        dayStartDate.getTime() +
          start * 60 * 1000
      );

      if (slotDateTime < earliestAllowed) {
        continue;
      }

      const overlapCount = existing.filter((booking) => {
        const bookingStart = toMinutes(
          booking.startTime
        );

        const bookingEnd =
          toMinutes(booking.endTime) +
          (booking.service?.bufferMin || 0);

        return (
          start < bookingEnd &&
          end > bookingStart
        );
      }).length;

      if (overlapCount < maxConcurrent) {
        slots.push(toHHMM(start));
      }
    }

    return NextResponse.json({
      slots,
      workingHours: {
        isOpen,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        special: Boolean(special)
      }
    });
  } catch (error) {
    console.error("Availability error:", error);

    return NextResponse.json(
      { error: "تعذر تحميل المواعيد المتاحة" },
      { status: 500 }
    );
  }
}
