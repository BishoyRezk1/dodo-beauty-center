import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/working-hours — public: needed so the booking flow can hide closed days
export async function GET() {
  const hours = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json(hours);
}

// PATCH /api/working-hours — admin: bulk update all 7 days at once
// Body: { days: [{ dayOfWeek, isOpen, startTime, endTime, breakStart, breakEnd }] }
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { days } = await req.json();
  await Promise.all(
    days.map((d: any) =>
      prisma.workingHours.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        update: {
          isOpen: d.isOpen,
          startTime: d.startTime,
          endTime: d.endTime,
          breakStart: d.breakStart || null,
          breakEnd: d.breakEnd || null
        },
        create: {
          dayOfWeek: d.dayOfWeek,
          isOpen: d.isOpen,
          startTime: d.startTime,
          endTime: d.endTime,
          breakStart: d.breakStart || null,
          breakEnd: d.breakEnd || null
        }
      })
    )
  );

  const hours = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json(hours);
}
