import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const allowedStatuses = ["AVAILABLE", "COMING_SOON", "HIDDEN"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();

  if (body.status && !allowedStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: "حالة الخدمة غير صحيحة" },
      { status: 400 }
    );
  }

  if (body.price !== undefined && Number(body.price) < 0) {
    return NextResponse.json(
      { error: "السعر لا يمكن أن يكون سالبًا" },
      { status: 400 }
    );
  }

  if (
    body.status === "AVAILABLE" &&
    body.price !== undefined &&
    Number(body.price) <= 0
  ) {
    return NextResponse.json(
      { error: "الخدمة المتاحة للحجز يجب أن يكون لها سعر أكبر من صفر" },
      { status: 400 }
    );
  }

  if (
    body.discountPrice !== undefined &&
    body.discountPrice !== null &&
    Number(body.discountPrice) < 0
  ) {
    return NextResponse.json(
      { error: "سعر الخصم غير صحيح" },
      { status: 400 }
    );
  }

  const service = await prisma.service.update({
    where: { id: params.id },
    data: body
  });

  return NextResponse.json(service);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const service = await prisma.service.update({
    where: { id: params.id },
    data: {
      isActive: false,
      status: "HIDDEN"
    }
  });

  return NextResponse.json(service);
}
