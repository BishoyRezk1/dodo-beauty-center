import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 60);
  const onlyUnread = req.nextUrl.searchParams.get("unread") === "1";

  const where = {
    lastMessageAt: { not: null },
    ...(onlyUnread ? { adminUnread: { gt: 0 } } : {}),
    ...(q
      ? { customer: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } }
      : {})
  };

  const [rows, agg] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        adminUnread: true,
        customerLastSeenAt: true,
        customer: { select: { id: true, name: true, phone: true } }
      }
    }),
    prisma.conversation.aggregate({ _sum: { adminUnread: true } })
  ]);

  return NextResponse.json({ conversations: rows, totalUnread: agg._sum.adminUnread || 0 });
}
