import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitDb, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, isValidEgPhone } from "@/lib/phone";
import { setCustomerSession } from "@/lib/customer-session";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(60),
  phone: z.string().min(8, "رقم الموبايل غير صالح"),
  password: z.string().min(8, "الباسورد 8 حروف على الأقل").max(72),
  bookingNumber: z.string().trim().max(40).optional()
});

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimitDb(`acct-reg:${getClientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "محاولات كتيرة، حاولي بعد شوية." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return NextResponse.json({ error: msg || "بيانات غير صحيحة" }, { status: 400 });
  }
  const { name, password, bookingNumber } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);
  if (!isValidEgPhone(phone)) {
    return NextResponse.json({ error: "رقم الموبايل غير صالح" }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({
    where: { phone },
    include: { bookings: { select: { bookingNumber: true } } }
  });

  if (existing?.passwordHash) {
    return NextResponse.json({ error: "الرقم ده عليه حساب بالفعل، سجّلي دخول." }, { status: 409 });
  }
  if (existing?.isBlocked) {
    return NextResponse.json({ error: "غير مسموح بإنشاء حساب بهذا الرقم." }, { status: 403 });
  }

  // Phone already has bookings but no account: require a past booking number
  // as proof of ownership, so nobody can claim someone else's history.
  if (existing && existing.bookings.length > 0) {
    const bn = (bookingNumber || "").toLowerCase();
    if (!bn || !existing.bookings.some((b) => b.bookingNumber.toLowerCase() === bn)) {
      return NextResponse.json(
        { error: "الرقم ده ليه حجوزات قبل كده. اكتبي رقم أي حجز سابق للتأكيد.", code: "NEEDS_BOOKING_NUMBER" },
        { status: 403 }
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const customer = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data: { passwordHash } })
      : await prisma.customer.create({ data: { name, phone, passwordHash } });
    setCustomerSession(customer.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر إنشاء الحساب، حاولي تاني." }, { status: 500 });
  }
}
