"use client";

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
