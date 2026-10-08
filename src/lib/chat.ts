import { prisma } from "@/lib/prisma";
import type { Message } from "@prisma/client";

export const MAX_TEXT = 2000;

export const messageInclude = {
  replyTo: { select: { id: true, sender: true, kind: true, body: true, deletedAt: true } }
} as const;

type MsgWithReply = Message & {
  replyTo: Pick<Message, "id" | "sender" | "kind" | "body" | "deletedAt"> | null;
};

export function serializeMessage(m: MsgWithReply) {
  const gone = !!m.deletedAt;
  return {
    id: m.id,
    sender: m.sender,
    kind: m.kind,
    body: gone ? null : m.body,
    imageUrl: gone ? null : m.imageUrl,
    serviceId: m.serviceId,
    bookingId: m.bookingId,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          sender: m.replyTo.sender,
          kind: m.replyTo.kind,
          body: m.replyTo.deletedAt ? null : (m.replyTo.body || "").slice(0, 80)
        }
      : null,
    deliveredAt: m.deliveredAt,
    readAt: m.readAt,
    deletedAt: m.deletedAt,
    createdAt: m.createdAt
  };
}

export function previewOf(kind: string, body?: string | null) {
  if (kind === "IMAGE") return body ? `📷 ${body}`.slice(0, 80) : "📷 صورة";
  if (kind === "BOOKING_CARD") return "📅 تفاصيل حجز";
  return (body || "").slice(0, 80);
}

// Only accept image URLs that came from our own storage.
export function isAllowedImageUrl(u: string) {
  try {
    if (u.startsWith("/uploads/")) return true;
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "res.cloudinary.com") return true;
    const sb = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;
    return !!sb && url.hostname === sb;
  } catch {
    return false;
  }
}

export function getOrCreateConversation(customerId: string) {
  return prisma.conversation.upsert({ where: { customerId }, update: {}, create: { customerId } });
}

export function parseDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
