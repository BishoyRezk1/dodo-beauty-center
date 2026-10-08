import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer-session";
import { publishChat } from "@/lib/pusher";

// POST /api/chat/read — customer opened the chat: mark admin messages read.
export async function POST() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const conv = await prisma.conversation.findUnique({ where: { customerId: c.id } });
  if (!conv) return NextResponse.json({ ok: true });

  const now = new Date();
  await prisma.message.updateMany({
    where: { conversationId: conv.id, sender: "ADMIN", deliveredAt: null },
    data: { deliveredAt: now }
  });
  const r = await prisma.message.updateMany({
    where: { conversationId: conv.id, sender: "ADMIN", readAt: null },
    data: { readAt: now }
  });
  await prisma.conversation.update({ where: { id: conv.id }, data: { customerUnread: 0 } });
  if (r.count > 0) await publishChat(conv.id, "read", { by: "CUSTOMER", at: now.toISOString() });
  return NextResponse.json({ ok: true });
}
