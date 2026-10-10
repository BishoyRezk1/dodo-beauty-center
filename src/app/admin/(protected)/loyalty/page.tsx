"use client";
import type { ErrLike } from "@/lib/err-like";

import { useEffect, useState } from "react";

type Reward = { id: string; title: string; cost: number; discountPercent: number };
type Cfg = { enabled: boolean; perBooking: number; perReview: number; silverAt: number; goldAt: number; rewards: Reward[] };
type Cust = { id: string; name: string; phone: string; balance: number };

const toInt = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
const JSON_H = { "Content-Type": "application/json" };

export default function LoyaltyAdminPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [custs, setCusts] = useState<Cust[]>([]);
  const [adj, setAdj] = useState<{ id: string; points: string; reason: string } | null>(null);

  async function loadCusts(term = "") {
    const res = await fetch(`/api/admin/loyalty/customers?q=${encodeURIComponent(term)}`, { cache: "no-store" });
    if (res.ok) setCusts((await res.json()).customers);
  }

  useEffect(() => {
    fetch("/api/admin/loyalty/config", { cache: "no-store" }).then(async (r) => {
      if (r.ok) setCfg(await r.json());
      else setNote("تعذّر التحميل");
    });
    loadCusts();
  }, []);

  function setField<K extends keyof Cfg>(k: K, v: Cfg[K]) {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
  }
  function setReward(i: number, patch: Partial<Reward>) {
    setCfg((c) => (c ? { ...c, rewards: c.rewards.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) } : c));
  }

  async function saveCfg() {
    if (!cfg) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/loyalty/config", { method: "POST", headers: JSON_H, body: JSON.stringify(cfg) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "تعذّر الحفظ");
      setCfg(d);
      setNote("تم الحفظ ✅");
    } catch (e_) { const e = e_ as ErrLike;
      setNote(e.message || "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function applyAdj() {
    if (!adj) return;
    const points = Math.trunc(Number(adj.points));
    if (!points) return setNote("اكتبي عدد نقاط صحيح (موجب للإضافة وسالب للخصم)");
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/loyalty/adjust", {
        method: "POST",
        headers: JSON_H,
        body: JSON.stringify({ customerId: adj.id, points, reason: adj.reason })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "تعذّر التنفيذ");
      setAdj(null);
      setNote("تم تعديل النقاط ✅");
      loadCusts(q.trim());
    } catch (e_) { const e = e_ as ErrLike;
      setNote(e.message || "تعذّر التنفيذ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-charcoal">نقاط الولاء 🏆</h1>
      {note && <p className="rounded-xl bg-blush/50 px-4 py-2 text-center text-sm font-bold text-wine">{note}</p>}

      <div className="card space-y-4 p-5">
        {!cfg ? (
          <p className="text-sm text-charcoal/60">جاري التحميل...</p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 font-bold text-charcoal">
              <span>تفعيل نظام النقاط للعميلات</span>
              <input type="checkbox" className="h-6 w-6" checked={cfg.enabled} onChange={(e) => setField("enabled", e.target.checked)} />
            </label>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="space-y-1">
                <span className="font-semibold">نقاط كل حجز مكتمل</span>
                <input type="number" min={0} className="input-field" value={cfg.perBooking} onChange={(e) => setField("perBooking", toInt(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">نقاط كل تقييم</span>
                <input type="number" min={0} className="input-field" value={cfg.perReview} onChange={(e) => setField("perReview", toInt(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">الفضية من (نقطة)</span>
                <input type="number" min={0} className="input-field" value={cfg.silverAt} onChange={(e) => setField("silverAt", toInt(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">الذهبية من (نقطة)</span>
                <input type="number" min={0} className="input-field" value={cfg.goldAt} onChange={(e) => setField("goldAt", toInt(e.target.value))} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-charcoal">المكافآت (بتتحوّل لكوبون خصم تلقائي)</div>
              {cfg.rewards.map((r, i) => (
                <div key={r.id} className="space-y-2 rounded-xl bg-blush/30 p-3">
                  <input className="input-field" placeholder="اسم المكافأة" value={r.title} onChange={(e) => setReward(i, { title: e.target.value })} />
                  <div className="flex items-center gap-2 text-xs">
                    <input type="number" min={1} className="input-field" value={r.cost} onChange={(e) => setReward(i, { cost: toInt(e.target.value) })} />
                    <span className="shrink-0">نقطة</span>
                    <input type="number" min={1} max={100} className="input-field" value={r.discountPercent} onChange={(e) => setReward(i, { discountPercent: toInt(e.target.value) })} />
                    <span className="shrink-0">% خصم</span>
                    <button
                      onClick={() => setCfg((c) => (c ? { ...c, rewards: c.rewards.filter((_, idx) => idx !== i) } : c))}
                      className="px-2 text-red-600"
                      aria-label="حذف"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
              {cfg.rewards.length < 10 && (
                <button
                  onClick={() =>
                    setCfg((c) => (c ? { ...c, rewards: [...c.rewards, { id: `r${Date.now()}`, title: "", cost: 100, discountPercent: 10 }] } : c))
                  }
                  className="btn-secondary !py-2 w-full"
                >
                  + إضافة مكافأة
                </button>
              )}
            </div>

            <button onClick={saveCfg} disabled={busy} className="btn-primary w-full">
              حفظ الإعدادات
            </button>
          </>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <div className="font-bold text-charcoal">أرصدة العميلات</div>
        <div className="flex gap-2">
          <input
            className="input-field"
            placeholder="بحث بالاسم أو الموبايل"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCusts(q.trim())}
          />
          <button onClick={() => loadCusts(q.trim())} className="btn-secondary !px-4">
            بحث
          </button>
        </div>

        {custs.length === 0 && <p className="text-sm text-charcoal/60">مفيش نتائج.</p>}

        {custs.map((c) => (
          <div key={c.id} className="rounded-xl border border-rosegold/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-bold text-charcoal">{c.name}</div>
                <div dir="ltr" className="text-right text-xs text-charcoal/60">
                  {c.phone}
                </div>
              </div>
              <div className="shrink-0 text-lg font-extrabold text-wine">{c.balance} ⭐</div>
            </div>

            {adj?.id === c.id ? (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  className="input-field"
                  placeholder="عدد النقاط (موجب إضافة، سالب خصم)"
                  value={adj.points}
                  onChange={(e) => setAdj({ ...adj, points: e.target.value })}
                />
                <input className="input-field" placeholder="السبب" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={applyAdj} disabled={busy} className="btn-primary !py-2 flex-1">
                    تنفيذ
                  </button>
                  <button onClick={() => setAdj(null)} className="btn-secondary !py-2 flex-1">
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdj({ id: c.id, points: "", reason: "" })} className="mt-2 text-xs font-bold text-wine">
                ± تعديل النقاط
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
