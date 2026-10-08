import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { publishChat } from "@/lib/pusher";

// Admin can delete only messages sent by the center (not the customer's).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const m = await prisma.message.findFirst({
    where: { id: params.id, sender: "ADMIN" },
    select: { id: true, conversationId: true }
  });
  if (!m) return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });

  await prisma.message.update({ where: { id: m.id }, data: { deletedAt: new Date(), body: null, imageUrl: null } });
  await publishChat(m.conversationId, "deleted", { id: m.id });
  return NextResponse.json({ ok: true });
}
