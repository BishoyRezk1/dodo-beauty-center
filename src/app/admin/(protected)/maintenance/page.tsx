"use client";

import { useEffect, useState } from "react";

export default function MaintenancePage() {
  const [on, setOn] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/maintenance", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setOn(!!d.on);
        setMessage(d.message || "");
      })
      .catch(() => setNote("تعذّر تحميل الحالة"));
  }, []);

  async function save(enabled: boolean) {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "تعذّر الحفظ");
      setOn(!!d.on);
      setMessage(d.message || message);
      setNote(enabled ? "تم إيقاف الموقع للعملاء" : "تم تشغيل الموقع");
    } catch (e: any) {
      setNote(e.message || "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (on === null) return;
    if (!on && !window.confirm("هتوقفي الموقع للعملاء ويظهرلهم رسالة التحديثات. متأكدة؟")) return;
    save(!on);
  }

  return (
    <div dir="rtl" className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-charcoal">إيقاف / تشغيل الموقع</h1>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-charcoal">حالة الموقع للعملاء</span>
          {on === null ? (
            <span className="text-sm text-charcoal/60">...</span>
          ) : on ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">🔴 موقوف</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">🟢 شغّال</span>
          )}
        </div>

        <button
          onClick={toggle}
          disabled={busy || on === null}
          className={`w-full rounded-full px-6 py-4 text-base font-extrabold text-white shadow-soft transition disabled:opacity-50 ${
            on ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {busy ? "..." : on ? "▶ تشغيل الموقع بالكامل" : "⏸ إيقاف الموقع للعملاء"}
        </button>

        {note && <p className="text-center text-sm font-bold text-wine">{note}</p>}
      </div>

      <div className="card space-y-3 p-5">
        <label className="font-bold text-charcoal">الرسالة اللي بتظهر للعملاء</label>
        <textarea
          rows={4}
          maxLength={300}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input-field"
        />
        <button
          onClick={() => save(!!on)}
          disabled={busy || on === null || !message.trim()}
          className="btn-secondary w-full disabled:opacity-50"
        >
          حفظ الرسالة
        </button>
      </div>

      <ul className="space-y-1 text-xs leading-6 text-charcoal/60">
        <li>• لوحة الأدمن بتفضل شغّالة عادي وإنتِ مسجّلة دخول.</li>
        <li>• الحجز الجديد بيتقفل كمان طول فترة الإيقاف.</li>
        <li>• جرّبي تفتحي الموقع من متصفح تاني (أو وضع التصفح الخاص) عشان تشوفي اللي العملاء بيشوفوه.</li>
      </ul>
    </div>
  );
}
