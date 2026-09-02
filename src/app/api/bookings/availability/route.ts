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

// GET /api/bookings/availability?serviceId=xxx&date=2026-09-15
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const dateStr = req.nextUrl.searchParams.get("date");

  if (!serviceId || !dateStr) {
    return NextResponse.json({ error: "serviceId و date مطلوبان" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: "الخدمة غير متاحة" }, { status: 404 });
  }

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }

  // Closed date check (holiday/day off)
  const closed = await prisma.closedDate.findUnique({ where: { date } });
  if (closed) {
    return NextResponse.json({ slots: [], reason: "هذا اليوم إجازة" });
  }

  const dayOfWeek = date.getDay();
  const wh = await prisma.workingHours.findUnique({ where: { dayOfWeek } });
  if (!wh || !wh.isOpen) {
    return NextResponse.json({ slots: [], reason: "المحل مغلق في هذا اليوم" });
  }

  const maxConcurrent = parseInt(await getSetting(SETTING_KEYS.MAX_CONCURRENT_BOOKINGS), 10) || 1;

  const dayStart = toMinutes(wh.startTime);
  const dayEnd = toMinutes(wh.endTime);
  const breakStart = wh.breakStart ? toMinutes(wh.breakStart) : null;
  const breakEnd = wh.breakEnd ? toMinutes(wh.breakEnd) : null;
  const duration = service.durationMin;
  const step = 30; // slot granularity in minutes

  // Existing bookings for that day that still hold a slot — include each
  // booking's own service buffer time, since a gap is needed after a
  // service (e.g. facial cleaning) before the next appointment can start,
  // regardless of which service that next appointment is for.
  const dayStartDate = new Date(`${dateStr}T00:00:00`);
  const dayEndDate = new Date(`${dateStr}T23:59:59`);
  const existing = await prisma.booking.findMany({
    where: {
      date: { gte: dayStartDate, lte: dayEndDate },
      status: { in: ["PENDING", "CONFIRMED"] }
    },
    select: { startTime: true, endTime: true, service: { select: { bufferMin: true } } }
  });

  const slots: string[] = [];
  for (let start = dayStart; start + duration <= dayEnd; start += step) {
    const end = start + duration;

    if (breakStart !== null && breakEnd !== null && start < breakEnd && end > breakStart) {
      continue; // overlaps break time
    }

    const overlapCount = existing.filter((b) => {
      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime) + (b.service?.bufferMin || 0);
      return start < bEnd && end > bStart;
    }).length;

    if (overlapCount < maxConcurrent) {
      slots.push(toHHMM(start));
    }
  }

  return NextResponse.json({ slots });
}
