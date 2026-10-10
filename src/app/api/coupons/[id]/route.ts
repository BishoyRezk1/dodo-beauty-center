import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string);
  const coupon = await prisma.coupon.update({ where: { id: params.id }, data: data as Prisma.CouponUpdateInput });
  return NextResponse.json(coupon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  await prisma.coupon.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
