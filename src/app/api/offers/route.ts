import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: includeInactive
      ? {}
      : { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { service: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(offers);
}

const offerSchema = z.object({
  title: z.string().min(2),
  details: z.string().optional(),
  imageUrl: z.string().optional(),
  oldPrice: z.number().positive(),
  newPrice: z.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional(),
  serviceId: z.string().optional().nullable()
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const offer = await prisma.offer.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate)
    }
  });
  return NextResponse.json(offer, { status: 201 });
}
