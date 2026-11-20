import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

/** حدّ اليوم بتوقيت القاهرة (بداية 00:00 أو نهاية 23:59:59) كـ Date. */
function cairoBoundary(dateStr: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const time = end ? "23:59:59" : "00:00:00";
  const wantHour = end ? "23" : "00";
  for (const off of ["+03:00", "+02:00"]) {
    const d = new Date(`${dateStr}T${time}${off}`);
    if (isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    if (get("hour") === wantHour && `${get("year")}-${get("month")}-${get("day")}` === dateStr) return d;
  }
  return new Date(`${dateStr}T${time}+02:00`);
}

// PATCH /api/admin/weekly-offer — مدة عرض الأسبوع لكل الكروت دفعة واحدة
// Body: { startDate?: "YYYY-MM-DD", endDate?: "YYYY-MM-DD", isActive?: boolean }
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const data: Prisma.OfferUpdateManyMutationInput = {};
  let start: Date | null = null;
  let end: Date | null = null;

  if (body.startDate) {
    start = cairoBoundary(String(body.startDate), false);
    if (!start) return NextResponse.json({ error: "تاريخ البداية غير صحيح" }, { status: 400 });
    data.startDate = start;
  }
  if (body.endDate) {
    end = cairoBoundary(String(body.endDate), true);
    if (!end) return NextResponse.json({ error: "تاريخ النهاية غير صحيح" }, { status: 400 });
    data.endDate = end;
  }
  if (start && end && end <= start) {
    return NextResponse.json({ error: "تاريخ النهاية لازم يكون بعد البداية" }, { status: 400 });
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (end && end > new Date()) data.archivedAt = null; // إعادة التشغيل تفك الأرشفة

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const r = await prisma.offer.updateMany({
    where: { service: { is: { category: "weekly-offer" } } },
    data
  });

  // الخدمات بتتخفّى تلقائيًا بعد انتهاء العرض، فعند التشغيل نرجّعها متاحة
  if (data.isActive === true) {
    await prisma.service.updateMany({
      where: { category: "weekly-offer" },
      data: { isActive: true, status: "AVAILABLE" }
    });
  }
  return NextResponse.json({ updated: r.count });
}
