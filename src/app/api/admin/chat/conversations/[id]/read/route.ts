import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { publishChat } from "@/lib/pusher";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const conv = await prisma.conversation.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!conv) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });

  const now = new Date();
  await prisma.message.updateMany({
    where: { conversationId: conv.id, sender: "CUSTOMER", deliveredAt: null },
    data: { deliveredAt: now }
  });
  const r = await prisma.message.updateMany({
    where: { conversationId: conv.id, sender: "CUSTOMER", readAt: null },
    data: { readAt: now }
  });
  await prisma.conversation.update({ where: { id: conv.id }, data: { adminUnread: 0 } });
  if (r.count > 0) await publishChat(conv.id, "read", { by: "ADMIN", at: now.toISOString() });
  return NextResponse.json({ ok: true });
}
