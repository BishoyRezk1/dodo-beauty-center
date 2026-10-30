"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Acc = {
  code: string; name: string; approved: boolean; openingBalance: number | null; openingDate: string | null;
  receipts: number; payments: number; transfersIn: number; transfersOut: number; bookBalance: number | null;
  lastCount: { counted: number; book: number; difference: number; date: string } | null;
};

const PINK = "#c2185b";
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const fdate = (s: string) => new Date(s).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const inp: CSSProperties = { width: "100%", height: 44, border: "1px solid #f3c4d5", borderRadius: 12, padding: "0 12px", fontSize: 15, background: "#fff", boxSizing: "border-box", fontFamily: "inherit", marginTop: 8 };
const btn: CSSProperties = { height: 46, border: 0, borderRadius: 14, background: PINK, color: "#fff", fontWeight: 800, fontSize: 15, padding: "0 18px", fontFamily: "inherit" };
const btn2: CSSProperties = { ...btn, background: "#fff", color: PINK, border: "1px solid " + PINK };
const card: CSSProperties = { background: "#fff", border: "1px solid #f3c4d5", borderRadius: 16, padding: 14, marginBottom: 12 };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", padding: "5px 0" };

async function call<T>(path: string, method: string, body?: unknown, key?: string): Promise<{ ok: boolean; data: T }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers["Idempotency-Key"] = key;
    const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, data: j as T };
  } catch {
    return { ok: false, data: { error: "تعذر الاتصال" } as unknown as T };
  }
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(40,10,25,.5)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} style={{ background: "#fff8fb", width: "100%", maxWidth: 560, maxHeight: "92dvh", overflowY: "auto", borderRadius: "28px 28px 0 0", padding: "16px 18px calc(24px + env(safe-area-inset-bottom,0px))", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

type Mode = { kind: "opening" | "count"; acc: Acc } | { kind: "transfer" } | null;

export default function AccountsPage() {
  const [accs, setAccs] = useState<Acc[] | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [toast, setToast] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 4500); }, []);
  const load = useCallback(async () => {
    const r = await call<{ accounts?: Acc[]; error?: string }>("/api/admin/accounts", "GET");
    if (r.ok) setAccs(r.data.accounts ?? []);
    else { setAccs([]); flash(r.data.error ?? "تعذر التحميل"); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);
  const [tr, setTr] = useState<Array<{ id: string; no: number; from: string; to: string; amount: number; date: string; note: string | null }>>([]);
  const loadTr = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/transfers");
      const j = await r.json();
      if (r.ok) setTr(j.transfers ?? []);
    } catch {}
  }, []);
  useEffect(() => { loadTr(); }, [loadTr]);

  async function voidTr(id: string) {
    const why = window.prompt("سبب إلغاء التحويل؟");
    if (!why || why.trim().length < 2) return;
    const r = await fetch("/api/admin/transfers/" + id, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: why.trim() }) });
    const j = await r.json().catch(() => ({} as { error?: string }));
    if (!r.ok) return flash(j.error ?? "تعذر الإلغاء");
    flash("تم إلغاء التحويل");
    load();
    loadTr();
  }

  function open(m: Mode) {
    setMode(m); setAmount(""); setReason(""); setDate(today()); setKey(uid());
    if (m && m.kind === "transfer" && accs && accs.length > 1) { setFrom(accs[0].code); setTo(accs[1].code); }
  }

  async function submit() {
    if (!mode) return;
    const a = parseFloat(amount);
    if (!(a >= 0) || amount === "") return flash("اكتب المبلغ");
    setBusy(true);
    let r: { ok: boolean; data: { error?: string; difference?: number; book?: number } };
    if (mode.kind === "opening") {
      r = await call(`/api/admin/accounts/${mode.acc.code}/opening`, "POST", { amount: a, date, reason: reason || null });
    } else if (mode.kind === "count") {
      r = await call(`/api/admin/accounts/${mode.acc.code}/count`, "POST", { counted: a, note: reason || null });
    } else {
      if (a <= 0) { setBusy(false); return flash("المبلغ لازم يكون أكبر من صفر"); }
      r = await call("/api/admin/transfers", "POST", { from, to, amount: a, note: reason || null, date }, key);
    }
    setBusy(false);
    if (!r.ok) return flash(r.data.error === "invalid" ? "راجع البيانات" : r.data.error ?? "تعذر التنفيذ");
    if (mode.kind === "count" && typeof r.data.difference === "number") {
      flash(r.data.difference === 0 ? "الجرد مطابق" : `الفرق ${fmt(r.data.difference)}`);
    } else flash("تمت العملية");
    setMode(null);
    load();
    loadTr();
  }

  const nameOf = (c: string) => accs?.find((x) => x.code === c)?.name ?? c;

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 120px" }}>
      {toast && <div style={{ position: "fixed", top: 78, left: "50%", transform: "translateX(-50%)", zIndex: 10001, background: "#2b1a22", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700 }}>{toast}</div>}
      <h1 style={{ fontWeight: 800, fontSize: 24, color: "#5a1535", margin: "0 0 12px" }}>الخزينة والحسابات</h1>
      {accs === null ? <div style={{ padding: 30, textAlign: "center" }}>جاري التحميل...</div> : accs.map((a) => (
        <div key={a.code} style={card}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{a.name}</div>
          <div style={row}>
            <span style={{ opacity: 0.7 }}>الرصيد الافتتاحي</span>
            {a.approved && a.openingBalance !== null
              ? <b>{fmt(a.openingBalance)} <span style={{ fontWeight: 400, opacity: 0.6, fontSize: 12 }}>من {a.openingDate}</span></b>
              : <span style={{ background: "#fde0eb", color: "#8a1c47", borderRadius: 8, padding: "2px 8px", fontSize: 12 }}>لم يُعتمد بعد</span>}
          </div>
          <div style={row}><span style={{ opacity: 0.7 }}>المقبوضات{a.approved ? "" : " (كل الفترة)"}</span><b style={{ color: "#1b7f4b" }}>{fmt(a.receipts)}</b></div>
          <div style={row}><span style={{ opacity: 0.7 }}>المدفوعات</span><b style={{ color: "#b42318" }}>{fmt(a.payments)}</b></div>
          <div style={row}><span style={{ opacity: 0.7 }}>تحويلات واردة</span><b>{fmt(a.transfersIn)}</b></div>
          <div style={row}><span style={{ opacity: 0.7 }}>تحويلات صادرة</span><b>{fmt(a.transfersOut)}</b></div>
          <div style={{ ...row, borderTop: "1px solid #fbe3ec", marginTop: 4, paddingTop: 8 }}>
            <b>الرصيد الدفتري</b><b style={{ fontSize: 17 }}>{a.bookBalance === null ? "—" : fmt(a.bookBalance)}</b>
          </div>
          {a.lastCount && (
            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.85 }}>
              آخر جرد ({fdate(a.lastCount.date)}): الفعلي {fmt(a.lastCount.counted)} · الفرق{" "}
              <b style={{ color: a.lastCount.difference === 0 ? "#1b7f4b" : "#b42318" }}>{fmt(a.lastCount.difference)}</b>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={btn2} onClick={() => open({ kind: "opening", acc: a })}>{a.approved ? "تعديل الافتتاحي" : "اعتماد الافتتاحي"}</button>
            <button type="button" disabled={!a.approved} style={{ ...btn2, opacity: a.approved ? 1 : 0.4 }} onClick={() => open({ kind: "count", acc: a })}>جرد</button>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7 }}>
        الرصيد الدفتري = الافتتاحي + المقبوضات − المدفوعات ± التحويلات، محسوبًا من تاريخ الاعتماد. لا يظهر رقم قبل اعتماد الرصيد الافتتاحي، ولا توجد أرصدة افتراضية.
      </div>
      {accs && accs.length > 1 && (
        <button type="button" onClick={() => open({ kind: "transfer" })} style={{ ...btn, position: "fixed", left: 16, bottom: "calc(20px + env(safe-area-inset-bottom,0px))", zIndex: 9000, borderRadius: 999, boxShadow: "0 12px 26px rgba(194,24,91,.4)" }}>تحويل بين حسابين</button>
      )}
      {mode && (
        <Sheet onClose={() => setMode(null)}>
          <h2 style={{ margin: 0, color: "#5a1535", fontSize: 20 }}>
            {mode.kind === "opening" ? `الرصيد الافتتاحي · ${mode.acc.name}` : mode.kind === "count" ? `جرد · ${mode.acc.name}` : "تحويل بين حسابين"}
          </h2>
          {mode.kind === "transfer" && (
            <div style={{ display: "flex", gap: 8 }}>
              <select style={inp} value={from} onChange={(e) => setFrom(e.target.value)}>{accs?.map((x) => <option key={x.code} value={x.code}>من: {x.name}</option>)}</select>
              <select style={inp} value={to} onChange={(e) => setTo(e.target.value)}>{accs?.map((x) => <option key={x.code} value={x.code}>إلى: {x.name}</option>)}</select>
            </div>
          )}
          {mode.kind === "opening" && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 8, lineHeight: 1.7 }}>اكتب الرصيد الفعلي بعد العد، والتاريخ الذي تبدأ منه المحاسبة. العمليات قبل هذا التاريخ تفضل في السجل ولا تدخل في الرصيد.</div>}
          {mode.kind === "count" && <div style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>الرصيد الدفتري الحالي: {mode.acc.bookBalance === null ? "—" : fmt(mode.acc.bookBalance)}</div>}
          <input style={inp} type="number" inputMode="decimal" placeholder={mode.kind === "count" ? "الرصيد الفعلي" : "المبلغ"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          {(mode.kind === "opening" || mode.kind === "transfer") && <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          <input style={inp} placeholder={mode.kind === "opening" ? (mode.acc.approved ? "سبب التعديل (إلزامي)" : "ملاحظة (اختياري)") : "ملاحظة (اختياري)"} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" disabled={busy} style={{ ...btn, width: "100%", marginTop: 14, opacity: busy ? 0.6 : 1 }} onClick={() => { if (window.confirm("تأكيد العملية؟")) submit(); }}>{busy ? "..." : "تأكيد"}</button>
        </Sheet>
      )}
      {tr.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, color: "#5a1535", marginBottom: 8 }}>آخر التحويلات</div>
          {tr.slice(0, 15).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #f0cfdd", borderRadius: 14, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13.5 }}>
                <div style={{ fontWeight: 800 }}>{fmt(t.amount)} · من {nameOf(t.from)} إلى {nameOf(t.to)}</div>
                <div style={{ opacity: 0.65, fontSize: 12 }}>{t.date.slice(0, 10)}{t.note ? " · " + t.note : ""}</div>
              </div>
              <button type="button" onClick={() => voidTr(t.id)} style={{ color: "#e03131", fontWeight: 800, fontSize: 13 }}>إلغاء</button>
            </div>
          ))}
        </div>
      )}
      {mode === null && accs && accs.length === 0 && <div style={{ textAlign: "center", opacity: 0.7 }}>لا توجد حسابات</div>}
      <span style={{ display: "none" }}>{nameOf("")}</span>
    </div>
  );
}
