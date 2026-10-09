"use client";

import { useEffect, useState } from "react";

type Reward = { id: string; title: string; cost: number; discountPercent: number };
type Data = {
  enabled: boolean;
  balance?: number;
  lifetime?: number;
  level?: { key: string; label: string; floor: number; nextAt: number | null };
  rewards?: Reward[];
  history?: { id: string; points: number; reason: string | null; createdAt: string }[];
};

export default function LoyaltyCard() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");

  async function load() {
    const r = await fetch("/api/account/loyalty", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function redeem(r: Reward) {
    if (!window.confirm(`استبدال ${r.cost} نقطة بـ «${r.title}»؟`)) return;
    setBusy(r.id);
    setMsg("");
    setCode("");
    try {
      const res = await fetch("/api/account/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: r.id })
      });
      const x = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(x.error || "تعذّر الاستبدال");
      setCode(x.code);
      await load();
    } catch (e: any) {
      setMsg(e.message || "تعذّر الاستبدال");
    } finally {
      setBusy("");
    }
  }

  if (!d || !d.enabled) return null;
  const balance = d.balance ?? 0;
  const lifetime = d.lifetime ?? 0;
  const lv = d.level;
  const span = lv && lv.nextAt ? Math.max(1, lv.nextAt - lv.floor) : 1;
  const pct = lv && lv.nextAt ? Math.min(100, Math.max(0, ((lifetime - lv.floor) / span) * 100)) : 100;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-charcoal/60">رصيد نقاطك</div>
          <div className="font-display text-3xl font-extrabold text-wine">{balance} ⭐</div>
        </div>
        {lv && <span className="rounded-full bg-blush px-3 py-1 text-sm font-bold text-wine">{lv.label}</span>}
      </div>

      {lv && lv.nextAt && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-blush">
            <div className="h-full rounded-full bg-wine" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-charcoal/60">باقي {Math.max(0, lv.nextAt - lifetime)} نقطة للمستوى الجاي</div>
        </div>
      )}

      {code && (
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <div className="text-xs font-bold text-emerald-700">كود الخصم بتاعك (صالح 30 يوم، استخدام واحد)</div>
          <div dir="ltr" className="mt-1 font-mono text-xl font-extrabold tracking-wider text-emerald-800">{code}</div>
          <button onClick={() => navigator.clipboard?.writeText(code)} className="mt-1 text-xs font-bold text-emerald-700">
            نسخ الكود
          </button>
        </div>
      )}
      {msg && <p className="text-sm font-bold text-red-600">{msg}</p>}

      {d.rewards && d.rewards.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-charcoal">استبدلي نقاطك</div>
          {d.rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-blush/30 px-3 py-2">
              <div>
                <div className="text-sm font-bold text-charcoal">{r.title}</div>
                <div className="text-xs text-charcoal/60">{r.cost} نقطة</div>
              </div>
              <button
                onClick={() => redeem(r)}
                disabled={balance < r.cost || !!busy}
                className="shrink-0 rounded-full bg-wine px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {busy === r.id ? "..." : "استبدال"}
              </button>
            </div>
          ))}
        </div>
      )}

      {d.history && d.history.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-sm font-bold text-charcoal">آخر الحركات</div>
          {d.history.slice(0, 10).map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-charcoal/70">{h.reason}</span>
              <span className={`shrink-0 font-bold ${h.points > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {h.points > 0 ? "+" : ""}
                {h.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
