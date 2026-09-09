import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  isOpen: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت بداية غير صالح"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "وقت نهاية غير صالح"),
  breakStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت بداية الراحة غير صالح")
    .nullable()
    .optional(),
  breakEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "وقت نهاية الراحة غير صالح")
    .nullable()
    .optional(),
  reason: z.string().max(500).nullable().optional()
});

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const normalized = date.toISOString().slice(0, 10);

  return normalized === value ? date : null;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

// GET /api/special-working-hours
export async function GET() {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const today = new Date(new Date().toDateString());

    const items = await prisma.specialWorkingHours.findMany({
      where: {
        date: {
          gte: today
        }
      },
      orderBy: {
        date: "asc"
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Special working hours GET error:", error);

    return NextResponse.json(
      { error: "تعذر تحميل ساعات العمل الخاصة" },
      { status: 500 }
    );
  }
}

// POST /api/special-working-hours
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "بيانات غير صحيحة",
          details: parsed.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const date = parseDate(data.date);

    if (!date) {
      return NextResponse.json(
        { error: "التاريخ غير صالح" },
        { status: 400 }
      );
    }

    const startMinutes = toMinutes(data.startTime);
    const endMinutes = toMinutes(data.endTime);

    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json(
        { error: "ساعات العمل غير صحيحة" },
        { status: 400 }
      );
    }

    if (data.isOpen && startMinutes >= endMinutes) {
      return NextResponse.json(
        { error: "وقت البداية يجب أن يكون قبل وقت النهاية" },
        { status: 400 }
      );
    }

    let breakStartMinutes: number | null = null;
    let breakEndMinutes: number | null = null;

    if (data.breakStart || data.breakEnd) {
      if (!data.breakStart || !data.breakEnd) {
        return NextResponse.json(
          {
            error:
              "يجب إدخال بداية ونهاية فترة الراحة معًا"
          },
          { status: 400 }
        );
      }

      breakStartMinutes = toMinutes(data.breakStart);
      breakEndMinutes = toMinutes(data.breakEnd);

      if (
        breakStartMinutes === null ||
        breakEndMinutes === null
      ) {
        return NextResponse.json(
          { error: "فترة الراحة غير صحيحة" },
          { status: 400 }
        );
      }

      if (breakStartMinutes >= breakEndMinutes) {
        return NextResponse.json(
          {
            error:
              "وقت بداية الراحة يجب أن يكون قبل نهايتها"
          },
          { status: 400 }
        );
      }

      if (
        data.isOpen &&
        (breakStartMinutes < startMinutes ||
          breakEndMinutes > endMinutes)
      ) {
        return NextResponse.json(
          {
            error:
              "فترة الراحة يجب أن تكون داخل ساعات العمل"
          },
          { status: 400 }
        );
      }
    }

    const item = await prisma.specialWorkingHours.upsert({
      where: {
        date
      },
      update: {
        isOpen: data.isOpen,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart ?? null,
        breakEnd: data.breakEnd ?? null,
        reason: data.reason ?? null
      },
      create: {
        date,
        isOpen: data.isOpen,
        startTime: data.startTime,
        endTime: data.endTime,
        breakStart: data.breakStart ?? null,
        breakEnd: data.breakEnd ?? null,
        reason: data.reason ?? null
      }
    });

    return NextResponse.json(item, {
      status: 201
    });
  } catch (error) {
    console.error("Special working hours POST error:", error);

    return NextResponse.json(
      { error: "تعذر حفظ ساعات العمل الخاصة" },
      { status: 500 }
    );
  }
}

// DELETE /api/special-working-hours?id=...
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "المعرف مطلوب" },
        { status: 400 }
      );
    }

    await prisma.specialWorkingHours.delete({
      where: {
        id
      }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Special working hours DELETE error:", error);

    return NextResponse.json(
      { error: "تعذر حذف ساعات العمل الخاصة" },
      { status: 500 }
    );
  }
}
