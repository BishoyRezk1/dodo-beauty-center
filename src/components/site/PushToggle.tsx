"use client";

import { useEffect, useState } from "react";

type St = "checking" | "unsupported" | "denied" | "off" | "on" | "unavailable";

function b64ToKey(b64: string): ArrayBuffer {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function bind(sub: PushSubscription) {
  return fetch("/api/account/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON())
  });
}

export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const [st, setSt] = useState<St>("checking");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setSt("unsupported");
        return;
      }
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        if (Notification.permission === "denied") return setSt("denied");
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          bind(sub).catch(() => {});
          setSt("on");
        } else {
          setSt("off");
        }
      } catch {
        setSt("unsupported");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setErr("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setSt(perm === "denied" ? "denied" : "off");
        return;
      }
      const kr = await fetch("/api/push/public-key");
      if (!kr.ok) {
        setSt("unavailable");
        return;
      }
      const { key } = await kr.json();
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToKey(key) });
      }
      const res = await bind(sub);
      if (!res.ok) throw new Error("bind failed");
      setSt("on");
    } catch {
      setErr("تعذّر تفعيل الإشعارات، حاولي تاني.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setErr("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/account/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setSt("off");
    } catch {
      setErr("تعذّر إيقاف الإشعارات.");
    } finally {
      setBusy(false);
    }
  }

  if (st === "checking" || st === "unavailable") return null;

  if (compact) {
    if (st !== "off") return null;
    return (
      <div className="flex items-center justify-between gap-2 border-b border-rosegold/20 bg-blush/40 px-3 py-2 text-xs">
        <span className="font-semibold text-charcoal">🔔 فعّلي الإشعارات عشان توصلك ردودنا</span>
        <button onClick={enable} disabled={busy} className="shrink-0 rounded-full bg-wine px-3 py-1.5 font-bold text-white disabled:opacity-50">
          {busy ? "..." : "تفعيل"}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4 text-sm">
      {st === "unsupported" && (
        <p className="text-charcoal/70">
          الإشعارات مش مدعومة في المتصفح ده. على الآيفون لازم تضيفي الموقع للشاشة الرئيسية الأول.
        </p>
      )}
      {st === "denied" && (
        <p className="text-charcoal/70">الإشعارات متقفلة من إعدادات المتصفح. افتحي إعدادات الموقع وفعّليها.</p>
      )}
      {st === "off" && (
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-charcoal">🔔 استقبلي تأكيد الحجز وردود السنتر</span>
          <button onClick={enable} disabled={busy} className="btn-primary !px-4 !py-2 shrink-0">
            {busy ? "..." : "تفعيل"}
          </button>
        </div>
      )}
      {st === "on" && (
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-emerald-700">🔔 الإشعارات شغّالة</span>
          <button onClick={disable} disabled={busy} className="shrink-0 text-xs font-bold text-wine">
            {busy ? "..." : "إيقاف"}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
    </div>
  );
}
