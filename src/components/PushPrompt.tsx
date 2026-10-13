"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const DISMISS = "pushDismissedAt";

function b64ToU8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribe() {
  const reg =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToU8(KEY) as unknown as BufferSource,
    });
  }
  await fetch("/api/push/customer/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
}

export default function PushPrompt() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (!KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      subscribe().catch(() => {});
      return;
    }
    try {
      const t = Number(localStorage.getItem(DISMISS) || 0);
      if (Date.now() - t < 7 * 24 * 3600 * 1000) return;
    } catch {}
    const id = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(id);
  }, [pathname]);

  function dismiss() {
    try { localStorage.setItem(DISMISS, String(Date.now())); } catch {}
    setShow(false);
  }

  async function enable() {
    try {
      const p = await Notification.requestPermission();
      if (p === "granted") await subscribe();
    } catch {}
    dismiss();
  }

  if (!show) return null;
  return (
    <div dir="rtl" style={{
      position: "fixed", left: 12, right: 12, bottom: 84, zIndex: 9999,
      background: "#fff", color: "#222", borderRadius: 16, padding: 16,
      boxShadow: "0 8px 30px rgba(0,0,0,.2)", border: "1px solid #f3d6e4",
      fontFamily: "inherit", maxWidth: 420, margin: "0 auto",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>🔔 وصّلك كل العروض الجديدة</div>
      <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
        فعّلي الإشعارات وهيجيلك تنبيه أول ما ننزّل عرض أو خصم، من غير أي تسجيل.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={enable} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: 0, background: "#d6336c", color: "#fff", fontWeight: 700 }}>
          فعّلي الإشعارات
        </button>
        <button onClick={dismiss} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}>
          لاحقاً
        </button>
      </div>
    </div>
  );
}
