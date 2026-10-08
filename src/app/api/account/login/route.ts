import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { setCustomerSession } from "@/lib/customer-session";

const DUMMY_HASH = bcrypt.hashSync("zina-dummy-password", 10);
const schema = z.object({ phone: z.string().min(8), password: z.string().min(1).max(72) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const phone = normalizePhone(parsed.data.phone);
  const a = rateLimit(`acct-login-ip:${getClientIp(req)}`, 15, 15 * 60 * 1000);
  const b = rateLimit(`acct-login-phone:${phone}`, 5, 15 * 60 * 1000);
  if (!a.allowed || !b.allowed) {
    return NextResponse.json({ error: "محاولات كتيرة، حاولي بعد شوية." }, { status: 429 });
  }

  const c = await prisma.customer.findUnique({ where: { phone } });
  const ok = await bcrypt.compare(parsed.data.password, c?.passwordHash || DUMMY_HASH);
  if (!c || !c.passwordHash || !ok || c.isBlocked) {
    return NextResponse.json({ error: "الموبايل أو الباسورد غلط" }, { status: 401 });
  }
  setCustomerSession(c.id);
  return NextResponse.json({ ok: true });
}
