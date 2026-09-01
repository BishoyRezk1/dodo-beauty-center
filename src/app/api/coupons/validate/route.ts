import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1), serviceId: z.string().min(1) });

// POST /api/coupons/validate — public: checks a coupon code is usable for a given service.
// Does NOT increment usedCount here; that happens when the booking is actually created,
// so an abandoned checkout doesn't burn a use.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const code = parsed.data.code.toUpperCase().trim();
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: "كود الخصم غير صالح" }, { status: 404 });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: "انتهت صلاحية كود الخصم" }, { status: 400 });
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ error: "تم استخدام الكود بالكامل" }, { status: 400 });
  }
  if (coupon.serviceId && coupon.serviceId !== parsed.data.serviceId) {
    return NextResponse.json({ error: "الكود لا يعمل على هذه الخدمة" }, { status: 400 });
  }

  return NextResponse.json({ valid: true, discountPercent: coupon.discountPercent });
}
