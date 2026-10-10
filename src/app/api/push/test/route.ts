import { NextResponse } from "next/server";
import crypto from "crypto";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

const b64u = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "VAPID keys missing" }, { status: 503 });

  let keysMatch = false;
  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(b64u(priv));
    keysMatch = ecdh.getPublicKey().equals(b64u(pub));
  } catch {}

  try {
    webpush.setVapidDetails("mailto:admin@zinanails.com", pub, priv);
    const admins = await prisma.pushSubscription.findMany({ where: { customerId: null } });
    const customers = await prisma.pushSubscription.count({ where: { customerId: { not: null } } });
    const results = await Promise.all(
      admins.map(async (s) => {
        const host = new URL(s.endpoint).host;
        try {
          const r = await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: "🔔 اختبار الإشعارات", body: "لو وصلتك الرسالة دي يبقى الإشعارات شغالة", url: "/admin" })
          );
          return { host, status: r.statusCode };
        } catch (e) {
          const err = e as { statusCode?: number; body?: string };
          return { host, status: err.statusCode ?? 0, body: String(err.body ?? "").slice(0, 120) };
        }
      })
    );
    return NextResponse.json({ keysMatch, adminDevices: admins.length, customerDevices: customers, results });
  } catch (e) {
    return NextResponse.json({ keysMatch, error: String((e as Error).message).slice(0, 200) }, { status: 500 });
  }
}
