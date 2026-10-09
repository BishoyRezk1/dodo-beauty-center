import { sendPushToCustomer } from "@/lib/push";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { publishChat } from "@/lib/pusher";
import { MAX_TEXT, messageInclude, serializeMessage, isAllowedImageUrl, parseDate } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    select: { id: true, customerLastSeenAt: true }
  });
  if (!conv) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 50, 100);
  const after = parseDate(sp.get("after"));
  const before = parseDate(sp.get("before"));

  let rows;
  if (after) {
    rows = await prisma.message.findMany({
      where: { conversationId: conv.id, createdAt: { gt: after } },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: messageInclude
    });
  } else {
    rows = await prisma.message.findMany({
      where: { conversationId: conv.id, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: messageInclude
    });
    rows.reverse();
  }

  await prisma.message.updateMany({
    where: { conversationId: conv.id, sender: "CUSTOMER", deliveredAt: null },
    data: { deliveredAt: new Date() }
  });

  return NextResponse.json({ messages: rows.map(serializeMessage), customerLastSeenAt: conv.customerLastSeenAt });
}

const sendSchema = z.object({
  text: z.string().trim().max(MAX_TEXT).optional(),
  imageUrl: z.string().max(1000).optional(),
  replyToId: z.string().max(60).optional(),
  serviceId: z.string().max(60).optional(),
  offerId: z.string().max(60).optional()
});

const cairoDate = (d: Date) =>
  d.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const conv = await prisma.conversation.findUnique({ where: { id: params.id }, select: { id: true, customerId: true } });
  if (!conv) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { text, imageUrl, replyToId, serviceId, offerId } = parsed.data;

  if (!text && !imageUrl && !serviceId && !offerId) {
    return NextResponse.json({ error: "الرسالة فاضية" }, { status: 400 });
  }
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "رابط الصورة غير مسموح" }, { status: 400 });
  }
  if (replyToId) {
    const r = await prisma.message.findFirst({ where: { id: replyToId, conversationId: conv.id }, select: { id: true } });
    if (!r) return NextResponse.json({ error: "الرسالة المردود عليها غير موجودة" }, { status: 400 });
  }

  // Cards are built server-side from real data (never from client-supplied text).
  let kind = imageUrl ? "IMAGE" : "TEXT";
  let body: string | null = text || null;
  let cardServiceId: string | null = null;

  if (serviceId) {
    const s = await prisma.service.findFirst({ where: { id: serviceId, isActive: true } });
    if (!s) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 400 });
    kind = "SERVICE_CARD";
    cardServiceId = s.id;
    body = `💅🏻 ${s.name}\n⏱ ${s.durationMin} دقيقة${text ? `\n\n${text}` : ""}`;
  } else if (offerId) {
    const o = await prisma.offer.findFirst({ where: { id: offerId, isActive: true, endDate: { gte: new Date() } } });
    if (!o) return NextResponse.json({ error: "العرض غير موجود أو منتهي" }, { status: 400 });
    kind = "OFFER_CARD";
    cardServiceId = o.serviceId;
    body = `🎁 ${o.title}\n${Number(o.newPrice)} جنيه بدل ${Number(o.oldPrice)} جنيه\n📅 لحد ${cairoDate(o.endDate)}${text ? `\n\n${text}` : ""}`;
  }

  const msg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      sender: "ADMIN",
      kind,
      body,
      imageUrl: imageUrl || null,
      serviceId: cardServiceId,
      replyToId: replyToId || null
    },
    include: messageInclude
  });

  const preview =
    kind === "IMAGE" ? (text ? `📷 ${text}` : "📷 صورة") : kind === "TEXT" ? (text || "") : (body || "").split("\n")[0];

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: msg.createdAt, lastMessagePreview: preview.slice(0, 80), customerUnread: { increment: 1 } }
  });

  const out = serializeMessage(msg);
  await publishChat(conv.id, "message", out);
  await sendPushToCustomer(conv.customerId, { title: "💬 Zina Nails", body: preview.slice(0, 80) || "رسالة جديدة", url: "/chat", tag: "chat" });
  return NextResponse.json({ message: out }, { status: 201 });
}
