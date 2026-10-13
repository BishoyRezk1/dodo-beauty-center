import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { title, body, url } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "title/body required" }, { status: 400 });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@zinanails.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const subs = await prisma.customerPushSubscription.findMany();
  const payload = JSON.stringify({ title, body, url: url || "/offers" });
  let sent = 0, removed = 0;

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.customerPushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        removed++;
      }
    }
  }));

  return NextResponse.json({ ok: true, total: subs.length, sent, removed });
}
