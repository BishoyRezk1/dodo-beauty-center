import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getCustomer } from "@/lib/customer-session";

const schema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) })
});

export async function POST(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const { allowed } = rateLimit(`push-sub:${c.id}`, 20, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "محاولات كتيرة" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, customerId: c.id },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, customerId: c.id }
  });

  // Keep at most 10 devices per customer.
  const all = await prisma.pushSubscription.findMany({
    where: { customerId: c.id },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (all.length > 10) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: all.slice(10).map((x) => x.id) } } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ error: "endpoint مطلوب" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint, customerId: c.id } });
  return NextResponse.json({ ok: true });
}
