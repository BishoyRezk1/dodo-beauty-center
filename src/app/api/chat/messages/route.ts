import { publishChat } from "@/lib/pusher";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getCustomer } from "@/lib/customer-session";
import { sendPushToAdmins } from "@/lib/push";
import {
  MAX_TEXT,
  messageInclude,
  serializeMessage,
  previewOf,
  isAllowedImageUrl,
  getOrCreateConversation,
  parseDate
} from "@/lib/chat";

export const dynamic = "force-dynamic";

// GET /api/chat/messages?after=<iso>&before=<iso>&limit=50
export async function GET(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const conv = await getOrCreateConversation(c.id);
  if (!conv.customerLastSeenAt || Date.now() - conv.customerLastSeenAt.getTime() > 60000) {
    await prisma.conversation.update({ where: { id: conv.id }, data: { customerLastSeenAt: new Date() } });
  }

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
    where: { conversationId: conv.id, sender: "ADMIN", deliveredAt: null },
    data: { deliveredAt: new Date() }
  });

  return NextResponse.json({
    messages: rows.map(serializeMessage),
    customerUnread: conv.customerUnread,
    conversationId: conv.id
  });
}

const sendSchema = z.object({
  text: z.string().trim().max(MAX_TEXT).optional(),
  imageUrl: z.string().max(1000).optional(),
  replyToId: z.string().max(60).optional(),
  bookingId: z.string().max(60).optional()
});

// POST /api/chat/messages
export async function POST(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const { allowed } = rateLimit(`chat-send:${c.id}`, 30, 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "بتبعتي بسرعة، استني شوية." }, { status: 429 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { text, imageUrl, replyToId, bookingId } = parsed.data;

  if (!text && !imageUrl && !bookingId) {
    return NextResponse.json({ error: "الرسالة فاضية" }, { status: 400 });
  }
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "رابط الصورة غير مسموح" }, { status: 400 });
  }

  const conv = await getOrCreateConversation(c.id);

  if (replyToId) {
    const r = await prisma.message.findFirst({
      where: { id: replyToId, conversationId: conv.id },
      select: { id: true }
    });
    if (!r) return NextResponse.json({ error: "الرسالة المردود عليها غير موجودة" }, { status: 400 });
  }
  if (bookingId) {
    const b = await prisma.booking.findFirst({
      where: { id: bookingId, customerId: c.id },
      select: { id: true }
    });
    if (!b) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 400 });
  }

  const kind = bookingId ? "BOOKING_CARD" : imageUrl ? "IMAGE" : "TEXT";
  const msg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      sender: "CUSTOMER",
      kind,
      body: text || null,
      imageUrl: imageUrl || null,
      bookingId: bookingId || null,
      replyToId: replyToId || null
    },
    include: messageInclude
  });

  await prisma.conversation.update({
    where: { id: conv.id },
    data: {
      lastMessageAt: msg.createdAt,
      lastMessagePreview: previewOf(kind, text),
      adminUnread: { increment: 1 }
    }
  });

  try {
    await sendPushToAdmins({
      title: `💬 رسالة جديدة من ${c.name}`,
      body: previewOf(kind, text),
      url: "/admin/chat"
    });
  } catch {}

  const out = serializeMessage(msg);
  await publishChat(conv.id, "message", out);
  return NextResponse.json({ message: out }, { status: 201 });
}
