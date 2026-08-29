import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// GET /api/services — public list of active services (or all, for admin)
export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";
  const services = await prisma.service.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json(services);
}

const serviceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional().nullable(),
  durationMin: z.number().int().positive(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

// POST /api/services — admin: create a service
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({ data: parsed.data });
  return NextResponse.json(service, { status: 201 });
}
