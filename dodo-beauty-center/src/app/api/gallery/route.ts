import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";
  const category = req.nextUrl.searchParams.get("category");
  const items = await prisma.galleryItem.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category } : {})
    },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json(items);
}

const schema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  imageUrl: z.string().min(1),
  beforeUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional()
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const item = await prisma.galleryItem.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
