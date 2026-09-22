import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails("mailto:admin@zinanails.com", publicKey, privateKey);
}

/**
 * Sends a push notification to every subscribed admin device. Silently
 * does nothing if VAPID keys aren't configured yet. Cleans up subscriptions
 * that are no longer valid (expired / unsubscribed).
 */
export async function sendPushToAdmins(payload: {
  title: string;
  body: string;
  url?: string;
}) {
  if (!publicKey || !privateKey) return;

  const subs = await prisma.pushSubscription.findMany();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    })
  );
}
