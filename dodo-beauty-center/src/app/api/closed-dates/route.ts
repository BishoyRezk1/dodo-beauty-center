import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// GET /api/closed-dates — public: booking flow uses this to grey out holidays
export async function GET() {
  const dates = await prisma.closedDate.findMany({
    where: { date: { gte: new Date(new Date().toDateString()) } },
    orderBy: { date: "asc" }
  });
  return NextResponse.json(dates);
}

const schema = z.object({ date: z.string(), reason: z.string().optional() });

// POST /api/closed-dates — admin: mark a day as a holiday / closed day
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const date = new Date(`${parsed.data.date}T00:00:00`);
  const closed = await prisma.closedDate.upsert({
    where: { date },
    update: { reason: parsed.data.reason },
    create: { date, reason: parsed.data.reason }
  });
  return NextResponse.json(closed, { status: 201 });
}
