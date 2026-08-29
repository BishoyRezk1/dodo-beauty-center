import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/notifications — admin: latest notifications + unread count
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { isRead: false } })
  ]);
  return NextResponse.json({ items, unreadCount });
}

// PATCH /api/notifications — admin: mark all (or one) as read
// Body: { id?: string }  — omit id to mark everything as read
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  if (body.id) {
    await prisma.notification.update({ where: { id: body.id }, data: { isRead: true } });
  } else {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  }
  return NextResponse.json({ ok: true });
}
