import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/offers/:id — public: used by the booking flow to show the
// offer's discounted price when a customer arrives via an offer link.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const offer = await prisma.offer.findUnique({ where: { id: params.id } });
  if (!offer) return NextResponse.json({ error: "العرض غير موجود" }, { status: 404 });
  return NextResponse.json(offer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const data: any = { ...body };
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const offer = await prisma.offer.update({ where: { id: params.id }, data });
  return NextResponse.json(offer);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  await prisma.offer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
