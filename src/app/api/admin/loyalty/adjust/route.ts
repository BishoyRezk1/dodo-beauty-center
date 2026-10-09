import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getTotals } from "@/lib/loyalty";

const schema = z.object({
  customerId: z.string().min(1).max(60),
  points: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 10000, "عدد النقاط غير صالح"),
  reason: z.string().trim().min(1, "اكتبي السبب").max(120)
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "بيانات غير صحيحة" }, { status: 400 });
  }
  const { customerId, points, reason } = parsed.data;

  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!c) return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 });

  if (points < 0) {
    const { balance } = await getTotals(customerId);
    if (balance + points < 0) return NextResponse.json({ error: "الرصيد مش كفاية للخصم ده" }, { status: 400 });
  }

  await prisma.loyaltyTransaction.create({
    data: { customerId, points, type: "MANUAL", reason: `تعديل من الإدارة: ${reason}` }
  });
  return NextResponse.json({ ok: true });
}
