#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

mkdir -p src/app/api/push/subscribe

python - <<'PY'
from pathlib import Path

# 1) موديل الاشتراكات في الـ schema (للتوثيق فقط — الجدول هيتعمل يدويًا بـ SQL)
p = Path('prisma/schema.prisma')
t = p.read_text(encoding='utf-8')
old = 'model Coupon {'
new = '''model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}

model Coupon {'''
if old in t and 'model PushSubscription' not in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('schema.prisma: تم إضافة موديل PushSubscription')
else:
    print('schema.prisma: تحذير أو موجود بالفعل')

# 2) مكتبة الإرسال
Path('src/lib/push.ts').write_text('''import webpush from "web-push";
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
''', encoding='utf-8')
print('src/lib/push.ts: تم الإنشاء')

# 3) API حفظ الاشتراك
Path('src/app/api/push/subscribe/route.ts').write_text('''import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth },
    create: { endpoint, p256dh, auth }
  });

  return NextResponse.json({ ok: true });
}
''', encoding='utf-8')
print('src/app/api/push/subscribe/route.ts: تم الإنشاء')

# 4) Service Worker
Path('public/sw.js').write_text('''self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Zina Nails";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/admin/bookings" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/bookings";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
''', encoding='utf-8')
print('public/sw.js: تم الإنشاء')

# 5) كومبوننت زرار تفعيل الإشعارات
Path('src/components/admin/PushNotificationSetup.tsx').write_text('''"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushNotificationSetup() {
  const [status, setStatus] = useState<
    "checking" | "idle" | "subscribed" | "unsupported" | "denied"
  >("checking");

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "subscribed" : "idle");
      } catch {
        setStatus("idle");
      }
    }
    check();
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push setup failed", err);
    }
  }

  if (status === "checking" || status === "unsupported" || status === "subscribed" || status === "denied") {
    return null;
  }

  return (
    <button
      onClick={enable}
      className="fixed bottom-20 left-4 z-50 rounded-full bg-wine px-4 py-3 text-xs font-bold text-cream shadow-soft md:bottom-4"
    >
      🔔 فعّلي إشعارات الحجوزات الفورية
    </button>
  );
}
''', encoding='utf-8')
print('PushNotificationSetup.tsx: تم الإنشاء')

# 6) ضيفه في AdminShell
p = Path('src/components/admin/AdminShell.tsx')
t = p.read_text(encoding='utf-8')

old_import = 'import { useState, useEffect } from "react";'
new_import = 'import { useState, useEffect } from "react";\nimport PushNotificationSetup from "./PushNotificationSetup";'

old_div = '    <div className="flex min-h-screen bg-cream">'
new_div = '    <div className="flex min-h-screen bg-cream">\n      <PushNotificationSetup />'

if old_import in t and old_div in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_div, new_div, 1)
    p.write_text(t, encoding='utf-8')
    print('AdminShell.tsx: تم تفعيل زرار الإشعارات')
else:
    print('تحذير - AdminShell.tsx مش لاقي النص المتوقع')

# 7) إرسال إشعار Push عند كل حجز جديد
p = Path('src/app/api/bookings/route.ts')
t = p.read_text(encoding='utf-8')

old_import2 = 'import { sendWhatsAppMessage, newBookingAdminMessage } from "@/lib/whatsapp";'
new_import2 = 'import { sendWhatsAppMessage, newBookingAdminMessage } from "@/lib/whatsapp";\nimport { sendPushToAdmins } from "@/lib/push";'

old_send = '''    sendWhatsAppMessage(
      shopNumber,
      message
    ).catch(() => {});'''
new_send = '''    sendWhatsAppMessage(
      shopNumber,
      message
    ).catch(() => {});

    sendPushToAdmins({
      title: "🔔 حجز جديد",
      body: `${name} حجزت ${booking.service.name} — ${booking.bookingNumber}`,
      url: "/admin/bookings"
    }).catch(() => {});'''

if old_import2 in t and old_send in t:
    t = t.replace(old_import2, new_import2, 1)
    t = t.replace(old_send, new_send, 1)
    p.write_text(t, encoding='utf-8')
    print('bookings/route.ts: تم ربط إشعار Push بالحجز الجديد')
else:
    print('تحذير - bookings/route.ts مش لاقي النص المتوقع')
PY

echo "تم بناء نظام إشعارات Push للحجوزات الجديدة"
