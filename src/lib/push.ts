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

  const subs = await prisma.pushSubscription.findMany({ where: { customerId: null } });

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
      } catch (e) {
        const err = e as { statusCode?: number };
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    })
  );
}

/**
 * Sends a push notification to every device a given customer enabled
 * notifications on. Never throws; expired subscriptions are cleaned up.
 */
export async function sendPushToCustomer(
  customerId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!publicKey || !privateKey) return;

  const subs = await prisma.pushSubscription.findMany({ where: { customerId } });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
      } catch (e) {
        const err = e as { statusCode?: number };
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
