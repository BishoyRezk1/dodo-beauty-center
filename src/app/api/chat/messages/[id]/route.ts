import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer-session";
import { publishChat } from "@/lib/pusher";

// DELETE /api/chat/messages/:id — a customer can delete only her own messages.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const m = await prisma.message.findFirst({
    where: { id: params.id, sender: "CUSTOMER", conversation: { customerId: c.id } },
    select: { id: true, conversationId: true }
  });
  if (!m) return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });

  await prisma.message.update({
    where: { id: m.id },
    data: { deletedAt: new Date(), body: null, imageUrl: null }
  });
  await publishChat(m.conversationId, "deleted", { id: m.id });
  return NextResponse.json({ ok: true });
}
