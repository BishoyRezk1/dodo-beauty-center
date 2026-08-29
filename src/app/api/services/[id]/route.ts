import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const service = await prisma.service.update({
    where: { id: params.id },
    data: body
  });
  return NextResponse.json(service);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  // Soft-delete pattern: keep history intact (bookings reference this
  // service), just hide it from the public site.
  const service = await prisma.service.update({
    where: { id: params.id },
    data: { isActive: false }
  });
  return NextResponse.json(service);
}
