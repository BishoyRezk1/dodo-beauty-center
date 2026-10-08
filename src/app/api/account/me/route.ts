import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "غير مسجّلة" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { customerId: c.id },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 50,
    select: {
      id: true,
      bookingNumber: true,
      date: true,
      startTime: true,
      status: true,
      service: { select: { name: true } }
    }
  });

  return NextResponse.json({
    customer: { name: c.name, phone: c.phone, email: c.email },
    bookings
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.union([z.string().trim().email().max(120), z.literal("")]).optional()
});

export async function PATCH(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "غير مسجّلة" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await prisma.customer.update({
    where: { id: c.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {})
    }
  });
  return NextResponse.json({ ok: true });
}
