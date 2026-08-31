import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const coupons = await prisma.coupon.findMany({
    include: { service: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(coupons);
}

const schema = z.object({
  code: z.string().min(2),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable()
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const code = parsed.data.code.toUpperCase().trim();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "الكود مستخدم بالفعل" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discountPercent: parsed.data.discountPercent,
      maxUses: parsed.data.maxUses ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      serviceId: parsed.data.serviceId || null
    }
  });
  return NextResponse.json(coupon, { status: 201 });
}
