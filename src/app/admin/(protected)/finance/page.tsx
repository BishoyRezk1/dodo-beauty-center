"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Entry = {
  id: string; type: "income" | "expense"; amount: number; category: string;
  method: "cash" | "vodafone_cash"; date: string; description: string | null;
  source?: "LEDGER" | "INVOICE"; invoiceNo?: number;
  due?: { id: string; total: number; collected: number; remaining: number };
};
type Bucket = { income: number; expense: number; net: number };
type Summary = { today: Record<string, Bucket>; month: Record<string, Bucket> };
type Opening = { code: string; name: string; opening: number | null; closing: number | null };
type Form = {
  type: "income" | "expense"; amount: string; category: string;
  method: "cash" | "vodafone_cash"; date: string; description: string;
};

const CATS = {
  income: ["خدمات", "منتجات", "عربون حجز", "أخرى"],
  expense: ["خامات ومستلزمات", "إيجار", "مرتبات", "كهرباء ومياه", "تسويق", "صيانة", "أخرى"],
};
const ICON: Record<string, string> = {
  "خدمات": "💅", "منتجات": "🛍️", "عربون حجز": "🎟️", "أخرى": "✨",
  "خامات ومستلزمات": "🧴", "إيجار": "🏠", "مرتبات": "👩‍💼", "كهرباء ومياه": "💡",
  "تسويق": "📣", "صيانة": "🔧",
};
const ML = { cash: "نقدي", vodafone_cash: "Vodafone Cash" } as const;
const MI = { cash: "💵", vodafone_cash: "📱" } as const;
const H = { "Content-Type": "application/json" };
const GREEN = "#2f9e44";
const RED = "#e03131";
const ROSE = "#c2185b";
const ZERO: Bucket = { income: 0, expense: 0, net: 0 };

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const fmtS = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + fmt(Math.abs(n));
const cairoToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const shiftDay = (d: string, delta: number) =>
  new Date(new Date(d + "T12:00:00Z").getTime() + delta * 86400000).toISOString().slice(0, 10);
const netColor = (n: number) => (n >= 0 ? GREEN : RED);
const iconOf = (c: string, t: string) => ICON[c] || (t === "income" ? "💰" : "🧾");

function dayLabel(d: string, today: string) {
  if (d === today) return "اليوم";
  if (today && d === shiftDay(today, -1)) return "أمس";
  return new Date(d + "T12:00:00Z").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

const chip = (on: boolean, color = ROSE): CSSProperties => ({
  padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700,
  border: "1.5px solid " + (on ? color : "#f0cfdd"),
  background: on ? color : "#fff", color: on ? "#fff" : "#5a2a3d",
  transition: "all .15s",
});

const CSS = `
.fn-card{background:#fff;border:1px solid #f6dbe7;border-radius:18px;box-shadow:0 4px 14px rgba(194,24,91,.05)}
.fn-input{width:100%;border:1.5px solid #f0cfdd;border-radius:14px;padding:11px 13px;font-size:16px;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;color:#2b1a22}
.fn-input:focus{border-color:#c2185b;box-shadow:0 0 0 3px rgba(194,24,91,.12)}
.fn-press:active{transform:scale(.96)}
.fn-press{transition:transform .12s}
.fn-overlay{position:fixed;inset:0;background:rgba(40,10,25,.5);z-index:9998;display:flex;align-items:flex-end;justify-content:center;animation:fn-fade .2s ease}
.fn-sheet{background:#fff8fb;width:100%;max-width:560px;max-height:92dvh;overflow-y:auto;border-radius:28px 28px 0 0;padding:14px 18px calc(22px + env(safe-area-inset-bottom,0px));animation:fn-up .25s ease}
.fn-fab{position:fixed;left:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:9000;border:0;border-radius:999px;padding:12px 18px;color:#fff;font-weight:800;font-size:14px;background:linear-gradient(135deg,#c2185b,#ec6b9a);box-shadow:0 10px 22px rgba(194,24,91,.35)}
.fn-toast{position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:10001;background:#2b1a22;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:700;animation:fn-fade .2s ease;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.fn-sk{background:linear-gradient(90deg,#f7e3ec 25%,#fdf0f5 50%,#f7e3ec 75%);background-size:200% 100%;animation:fn-sh 1.2s infinite;border-radius:18px}
@keyframes fn-fade{from{opacity:0}to{opacity:1}}
@keyframes fn-up{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
@keyframes fn-sh{from{background-position:200% 0}to{background-position:-200% 0}}
`;

export default function FinancePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [totals, setTotals] = useState<Bucket>(ZERO);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetErr, setSheetErr] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ type: "income", amount: "", category: "", method: "cash", date: "", description: "" });

  const [showFilters, setShowFilters] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [tFrom, setTFrom] = useState<"cash" | "vodafone_cash">("cash");
  const [tKey, setTKey] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ftype, setFtype] = useState("");
  const [fmethod, setFmethod] = useState("");
  const [q, setQ] = useState("");
  const [receivables, setReceivables] = useState({ total: 0, count: 0 });
  const [isDeferred, setIsDeferred] = useState(false);
  const [dTotal, setDTotal] = useState("");
  const [collectFor, setCollectFor] = useState<Entry | null>(null);
  const [cAmount, setCAmount] = useState("");
  const [cMethod, setCMethod] = useState<"cash" | "vodafone_cash">("cash");
  const [cKey, setCKey] = useState("");

  useEffect(() => { setToday(cairoToday()); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (ftype) p.set("type", ftype);
    if (fmethod) p.set("method", fmethod);
    if (q.trim()) p.set("q", q.trim());
    try {
      const r = await fetch("/api/admin/finance?" + p.toString());
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setEntries(d.entries); setSummary(d.summary); setOpenings(d.openings || []); setReceivables(d.receivables || { total: 0, count: 0 }); setTotals(d.totals); setTruncated(!!d.truncated);
    } catch {
      setErr("فشل تحميل البيانات");
    }
    setLoading(false);
  }, [from, to, ftype, fmethod, q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function openNew() {
    setIsTransfer(false); setIsDeferred(false); setDTotal("");
    setEditId(null); setSheetErr("");
    setForm((f) => ({ type: f.type, amount: "", category: "", method: f.method, date: today || cairoToday(), description: "" }));
    setSheetOpen(true);
  }

  function openEdit(e: Entry) {
    setIsTransfer(false);
    setEditId(e.id); setSheetErr("");
    setForm({ type: e.type, amount: String(e.amount), category: e.category, method: e.method, date: e.date, description: e.description || "" });
    setSheetOpen(true);
  }

  async function save() {
    setSheetErr("");
    const amt = parseFloat(form.amount);
    if (!defOn && !(amt > 0)) { setSheetErr("اكتبي مبلغ صحيح"); return; }
    if (defOn) {
      const paid = amt > 0 ? amt : 0;
      const total = parseFloat(dTotal);
      if (!(total > 0)) { setSheetErr("اكتبي الإجمالي المتفق عليه"); return; }
      if (paid >= total) { setSheetErr("المدفوع لازم يكون أقل من الإجمالي"); return; }
      if (!form.category) { setSheetErr("اختاري التصنيف"); return; }
      if (!form.date) { setSheetErr("اختاري التاريخ"); return; }
      setBusy(true);
      try {
        const r = await fetch("/api/admin/finance/deferred", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ type: "income", amount: paid, dueAmount: Math.round((total - paid) * 100) / 100, category: form.category, method: form.method, date: form.date, description: form.description || null }),
        });
        if (!r.ok) { const j = await r.json().catch(() => null); setSheetErr(j && j.error && j.error !== "invalid" ? j.error : "فشل الحفظ، راجعي البيانات"); }
        else { setSheetOpen(false); setToast("✓ تم الحفظ — المتبقي مسجّل آجل"); await load(); }
      } catch { setSheetErr("حصل خطأ في الاتصال"); }
      setBusy(false);
      return;
    }
    if (isTransfer) {
      setBusy(true);
      try {
        const r = await fetch("/api/admin/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": tKey || crypto.randomUUID() },
          body: JSON.stringify({ from: tFrom, to: tFrom === "cash" ? "vodafone_cash" : "cash", amount: amt, note: form.description || null, date: form.date || null }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          setSheetErr((j && j.error) || "فشل التحويل، حاولي تاني");
        } else {
          setSheetOpen(false);
          setToast("✓ تم التحويل"); setTKey(crypto.randomUUID());
          await load();
        }
      } catch {
        setSheetErr("حصل خطأ في الاتصال");
      }
      setBusy(false);
      return;
    }
    if (!form.category) { setSheetErr("اختاري التصنيف"); return; }
    if (!form.date) { setSheetErr("اختاري التاريخ"); return; }
    setBusy(true);
    try {
      const r = await fetch(editId ? "/api/admin/finance/" + editId : "/api/admin/finance", {
        method: editId ? "PATCH" : "POST",
        headers: H,
        body: JSON.stringify({ ...form, amount: amt }),
      });
      if (!r.ok) { const j = await r.json().catch(() => null); setSheetErr(r.status === 423 && j && j.error ? j.error : "فشل الحفظ، حاولي تاني"); }
      else {
        setSheetOpen(false);
        setToast(editId ? "✓ تم التعديل" : "✓ تم الحفظ");
        await load();
      }
    } catch {
      setSheetErr("حصل خطأ في الاتصال");
    }
    setBusy(false);
  }

  async function remove(e: Entry) {
    if (!confirm("حذف العملية دي نهائياً؟\n" + e.category + " — " + fmt(e.amount))) return;
    const r = await fetch("/api/admin/finance/" + e.id, { method: "DELETE" });
    setToast(r.ok ? "تم الحذف" : "فشل الحذف");
    await load();
  }

  function openCollect(e: Entry) {
    if (!e.due) return;
    setCollectFor(e); setCMethod("cash"); setCKey(crypto.randomUUID());
    setCAmount(String(e.due.remaining)); setSheetErr("");
  }

  async function doCollect() {
    if (!collectFor || !collectFor.due) return;
    const a = parseFloat(cAmount);
    if (!(a > 0)) { setSheetErr("اكتبي مبلغ صحيح"); return; }
    if (a > collectFor.due.remaining + 0.001) { setSheetErr("المبلغ أكبر من المتبقي"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/finance/" + collectFor.id + "/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": cKey },
        body: JSON.stringify({ amount: a, method: cMethod }),
      });
      if (!r.ok) { const j = await r.json().catch(() => null); setSheetErr(j && j.error && j.error !== "invalid" ? j.error : "فشل التحصيل"); }
      else { setCollectFor(null); setToast("✓ تم التحصيل"); await load(); }
    } catch { setSheetErr("حصل خطأ في الاتصال"); }
    setBusy(false);
  }

  const defOn = isDeferred && form.type === "income" && !isTransfer && !editId;
  const baseCats = CATS[form.type];
  const cats = !form.category || baseCats.includes(form.category) ? baseCats : [...baseCats, form.category];
  const tAll = summary?.today.all || ZERO;
  const mAll = summary?.month.all || ZERO;
  const activeFilters = !!(from || to || ftype || fmethod);

  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const a = m.get(e.date);
      if (a) a.push(e); else m.set(e.date, [e]);
    });
    return Array.from(m.entries());
  }, [entries]);

  const breakdown = useMemo(() => {
    const m = new Map<string, number>();
    entries.filter((e) => e.type === "expense").forEach((e) => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    const arr = Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = arr.reduce((s, x) => s + x[1], 0);
    return { arr, total, max: arr.length ? arr[0][1] : 0 };
  }, [entries]);

  const dateLabel = today
    ? new Date(today + "T12:00:00Z").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    : "";

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "12px 14px 110px" }}>
      <style>{CSS}</style>
      {toast && <div className="fn-toast">{toast}</div>}

      <div style={{ marginBottom: 12 }}>
        <h1 className="font-display" style={{ fontWeight: 800, fontSize: 21, color: "#5a1535", lineHeight: 1.3 }}>الإيرادات والمصروفات</h1>
        <div style={{ fontSize: 12.5, opacity: 0.6 }}>{dateLabel}</div>
      </div>

      {!summary ? (
        <>
          <div className="fn-sk" style={{ height: 130, marginBottom: 10 }} />
          <div className="fn-sk" style={{ height: 110, marginBottom: 10 }} />
        </>
      ) : (
        <>
          <div style={{
            background: "linear-gradient(135deg,#7a1d44 0%,#c2185b 55%,#ec6b9a 100%)",
            borderRadius: 20, padding: "14px 16px", color: "#fff",
            boxShadow: "0 10px 22px rgba(194,24,91,.22)", marginBottom: 10,
          }}>
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>صافي الشهر</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 800, margin: "2px 0 10px" }}>{fmtS(mAll.net)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,.16)", borderRadius: 12, padding: "7px 10px" }}>
                <div style={{ fontSize: 11.5, opacity: 0.85 }}>↑ إيرادات</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(mAll.income)}</div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,.16)", borderRadius: 12, padding: "7px 10px" }}>
                <div style={{ fontSize: 11.5, opacity: 0.85 }}>↓ مصروفات</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(mAll.expense)}</div>
              </div>
            </div>
          </div>

          <div className="fn-card" style={{ padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <b style={{ color: "#5a1535" }}>اليوم</b>
            <span style={{ flex: 1, display: "flex", justifyContent: "space-around", fontWeight: 800 }}>
              <span style={{ color: GREEN }}>↑ {fmt(tAll.income)}</span>
              <span style={{ color: RED }}>↓ {fmt(tAll.expense)}</span>
            </span>
            <b style={{ color: netColor(tAll.net) }}>{fmtS(tAll.net)}</b>
          </div>

          <div className="fn-card" style={{ padding: "6px 14px", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#5a1535", padding: "8px 0 2px" }}>رصيد الخزينة الآن</div>
            {(["cash", "vodafone_cash"] as const).map((k, i) => {
              const o = openings.find((x) => x.code === k);
              const m = summary.month[k] || ZERO;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1px solid #fbeaf1" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fdeaf2", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>{MI[k]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{ML[k]}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.65 }}>
                      {o && o.opening !== null ? <>أول اليوم {fmt(o.opening)} · </> : null}صافي الشهر <b style={{ color: netColor(m.net) }}>{fmtS(m.net)}</b>
                    </div>
                  </div>
                  {o && o.closing !== null ? (
                    <div style={{ fontWeight: 800, fontSize: 17, color: netColor(o.closing) }}>{fmt(o.closing)}</div>
                  ) : (
                    <a href="/admin/accounts" style={{ fontSize: 11.5, fontWeight: 700, color: ROSE }}>اعتمدي الافتتاحي</a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {receivables.count > 0 && (
        <div className="fn-card" style={{ padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <b style={{ color: "#b54708" }}>⏳ مستحقات عند العملاء ({receivables.count.toLocaleString("ar-EG")})</b>
          <b style={{ color: "#b54708", fontSize: 15 }}>{fmt(receivables.total)}</b>
        </div>
      )}

      {breakdown.arr.length > 0 && (
        <div className="fn-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
          <button onClick={() => setShowBreak((v) => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, color: "#5a1535" }}>
            <span>أين راحت المصروفات</span><span style={{ opacity: 0.6 }}>{showBreak ? "▲" : "▼"}</span>
          </button>
          {showBreak && (
            <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
              {breakdown.arr.map(([c, v]) => (
                <div key={c}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span>{iconOf(c, "expense")} {c}</span>
                    <span style={{ fontWeight: 700 }}>{fmt(v)} · {Math.round((v / breakdown.total) * 100).toLocaleString("ar-EG")}٪</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: "#fdecef", overflow: "hidden" }}>
                    <div style={{ width: (v / breakdown.max) * 100 + "%", height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#e03131,#f08fb0)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div className="font-display" style={{ fontWeight: 800, fontSize: 16, color: "#5a1535", flex: 1 }}>سجل العمليات</div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} className="fn-press"
            style={{ padding: "6px 12px", borderRadius: 999, border: "1.5px solid #f0cfdd", background: menuOpen ? "#fdeaf2" : "#fff", fontWeight: 700, fontSize: 12.5 }}>
            ☰ المزيد
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className="fn-card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, minWidth: 200, padding: 6, background: "#fff", boxShadow: "0 14px 30px rgba(90,21,53,.22)", borderRadius: 16 }}>
                {[
                  ["/admin/accounts", "🏦", "الأرصدة والتحويلات"],
                  ["/admin/archive", "🗂️", "الأرشيف الشهري"],
                  ["/admin/daily-close", "📒", "إغلاق اليوم"],
                ].map(([href, ic, label]) => (
                  <a key={href} href={href} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 12px", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5a1535", textDecoration: "none" }}>
                    <span>{ic}</span><span>{label}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="fn-press"
          style={{ position: "relative", padding: "6px 12px", borderRadius: 999, border: "1.5px solid #f0cfdd", background: showFilters ? "#fdeaf2" : "#fff", fontWeight: 700, fontSize: 12.5 }}>
          🎚️ فلاتر
          {activeFilters && <span style={{ position: "absolute", top: 3, left: 5, width: 8, height: 8, borderRadius: "50%", background: ROSE }} />}
        </button>
      </div>

      <input className="fn-input" placeholder="🔍 بحث في الوصف أو التصنيف" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8, padding: "9px 13px", fontSize: 15 }} />

      {showFilters && (
        <div className="fn-card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[["", "الكل"], ["income", "إيرادات"], ["expense", "مصروفات"]].map(([v, l]) => (
              <button key={v} className="fn-press" onClick={() => setFtype(v)} style={chip(ftype === v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[["", "كل الطرق"], ["cash", "💵 نقدي"], ["vodafone_cash", "📱 Vodafone Cash"]].map(([v, l]) => (
              <button key={v} className="fn-press" onClick={() => setFmethod(v)} style={chip(fmethod === v, "#7a1d44")}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <label style={{ flex: 1, fontSize: 12, opacity: 0.7 }}>من
              <input className="fn-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "8px 10px" }} />
            </label>
            <label style={{ flex: 1, fontSize: 12, opacity: 0.7 }}>إلى
              <input className="fn-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "8px 10px" }} />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, opacity: 0.7 }}>
            <span>التواريخ الفاضية = الشهر الحالي</span>
            {(activeFilters || q) && (
              <button onClick={() => { setFrom(""); setTo(""); setFtype(""); setFmethod(""); setQ(""); }} style={{ textDecoration: "underline", fontWeight: 700 }}>مسح الكل</button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, fontSize: 12, padding: "0 4px 8px", opacity: 0.85 }}>
        <span>{entries.length.toLocaleString("ar-EG")} عملية</span>
        <span>
          <b style={{ color: GREEN }}>+{fmt(totals.income)}</b> · <b style={{ color: RED }}>-{fmt(totals.expense)}</b> · صافي <b style={{ color: netColor(totals.net) }}>{fmt(totals.net)}</b>
        </span>
      </div>

      {err && <p style={{ color: RED, marginBottom: 8, fontWeight: 700 }}>{err}</p>}
      {loading && entries.length === 0 && <div className="fn-sk" style={{ height: 80 }} />}
      {truncated && <p style={{ fontSize: 12, color: RED, marginBottom: 8 }}>معروض أحدث 500 عملية بس، ضيّقي الفلتر.</p>}

      {!loading && !err && entries.length === 0 && (
        <div className="fn-card" style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 4 }}>📒</div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>مفيش عمليات في الفترة دي</div>
          <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 12 }}>سجّلي أول إيراد أو مصروف وهيظهر هنا.</div>
          <button onClick={openNew} className="fn-press" style={{ ...chip(true), padding: "9px 18px" }}>＋ عملية جديدة</button>
        </div>
      )}

      {groups.map(([d, list]) => {
        const dayNet = list.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
        return (
          <div key={d} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 5px", fontSize: 12.5 }}>
              <span style={{ fontWeight: 800, color: "#5a1535" }}>{dayLabel(d, today)}</span>
              <span style={{ fontWeight: 800, color: netColor(dayNet) }}>{fmtS(Math.round(dayNet * 100) / 100)}</span>
            </div>
            <div className="fn-card" style={{ overflow: "hidden" }}>
              {list.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: i ? "1px solid #fbeaf1" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: e.type === "income" ? "#e9f7ee" : "#fdecec", display: "grid", placeItems: "center", fontSize: 17, flexShrink: 0 }}>
                    {e.source === "INVOICE" ? "🏪" : iconOf(e.category, e.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{e.source === "INVOICE" ? "فاتورة متجر #" + e.invoiceNo : e.category}</div>
                    {e.description && e.source !== "INVOICE" && (
                      <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.description}</div>
                    )}
                    <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>{MI[e.method]} {ML[e.method]}{e.source === "INVOICE" ? " · " + e.category : ""}</div>
                    {e.due && (e.due.remaining > 0.001 ? (
                      <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 800, color: "#b54708" }}>⏳ متبقي {fmt(e.due.remaining)} من إجمالي {fmt(e.amount + e.due.total)}</div>
                    ) : (
                      <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 700, color: GREEN }}>✓ اتحصّل بالكامل</div>
                    ))}
                  </div>
                  <div style={{ textAlign: "left", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: e.type === "income" ? GREEN : RED }}>
                      {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                    </div>
                    {e.source !== "INVOICE" && (
                      <div style={{ display: "flex", gap: 5, marginTop: 4, justifyContent: "flex-end" }}>
                        {e.due && e.due.remaining > 0.001 && (
                          <button onClick={() => openCollect(e)} className="fn-press" style={{ height: 28, padding: "0 10px", borderRadius: 9, background: "#fff3e0", color: "#b54708", fontWeight: 800, fontSize: 12 }}>تحصيل</button>
                        )}
                        <button onClick={() => openEdit(e)} className="fn-press" aria-label="تعديل"
                          style={{ width: 28, height: 28, borderRadius: 9, background: "#fdf0f5", fontSize: 13 }}>✏️</button>
                        <button onClick={() => remove(e)} className="fn-press" aria-label="حذف"
                          style={{ width: 28, height: 28, borderRadius: 9, background: "#fdecec", fontSize: 13 }}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {collectFor && collectFor.due && (
        <div className="fn-overlay" onClick={() => setCollectFor(null)}>
          <div className="fn-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 44, height: 5, borderRadius: 5, background: "#e8c3d3", margin: "0 auto 12px" }} />
            <div className="font-display" style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: "#5a1535" }}>تحصيل متبقي</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>{collectFor.category}{collectFor.description ? " — " + collectFor.description : ""} · المتبقي <b>{fmt(collectFor.due.remaining)}</b></div>
            <input className="fn-input" type="number" inputMode="decimal" step="0.01" min="0" value={cAmount} onChange={(e) => setCAmount(e.target.value)}
              style={{ fontSize: 28, fontWeight: 800, textAlign: "center", color: GREEN, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["cash", "vodafone_cash"] as const).map((k) => (
                <button key={k} className="fn-press" onClick={() => setCMethod(k)}
                  style={{ flex: 1, padding: "11px 8px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                    border: "1.5px solid " + (cMethod === k ? "#7a1d44" : "#f0cfdd"),
                    background: cMethod === k ? "#7a1d44" : "#fff", color: cMethod === k ? "#fff" : "#5a2a3d" }}>
                  {MI[k]} {ML[k]}
                </button>
              ))}
            </div>
            {sheetErr && <p style={{ color: RED, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{sheetErr}</p>}
            <button disabled={busy} onClick={doCollect} className="fn-press"
              style={{ width: "100%", padding: 14, borderRadius: 16, fontWeight: 800, fontSize: 15.5, color: "#fff", opacity: busy ? 0.7 : 1, background: "linear-gradient(135deg,#2f9e44,#51cf66)" }}>
              {busy ? "جاري التحصيل..." : "تسجيل التحصيل"}
            </button>
            <button onClick={() => setCollectFor(null)} style={{ width: "100%", padding: 10, marginTop: 4, fontWeight: 700, opacity: 0.6 }}>إلغاء</button>
          </div>
        </div>
      )}

      {!sheetOpen && <button className="fn-fab fn-press" onClick={openNew}>＋ عملية جديدة</button>}

      {sheetOpen && (
        <div className="fn-overlay" onClick={() => setSheetOpen(false)}>
          <div className="fn-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 44, height: 5, borderRadius: 5, background: "#e8c3d3", margin: "0 auto 12px" }} />
            <div className="font-display" style={{ fontWeight: 800, fontSize: 18, marginBottom: 10, color: "#5a1535" }}>
              {editId ? "تعديل عملية" : "عملية جديدة"}
            </div>

            <div style={{ display: "flex", gap: 4, background: "#fdeaf2", padding: 4, borderRadius: 16, marginBottom: 12 }}>
              {(["income", "expense"] as const).map((t) => (
                <button key={t} className="fn-press" onClick={() => { setIsTransfer(false); setForm({ ...form, type: t, category: "" }); }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 800, fontSize: 14.5,
                    background: !isTransfer && form.type === t ? (t === "income" ? GREEN : RED) : "transparent",
                    color: !isTransfer && form.type === t ? "#fff" : "#7a1d44", transition: "all .15s" }}>
                  {t === "income" ? "↑ إيراد" : "↓ مصروف"}
                </button>
              ))}
              {!editId && (
                <button className="fn-press" onClick={() => { setIsTransfer(true); setSheetErr(""); if (!tKey) setTKey(crypto.randomUUID()); }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 800, fontSize: 14.5,
                    background: isTransfer ? "#7a1d44" : "transparent",
                    color: isTransfer ? "#fff" : "#7a1d44", transition: "all .15s" }}>
                  ⇄ تحويل
                </button>
              )}
            </div>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <input className="fn-input" type="number" inputMode="decimal" step="0.01" min="0" placeholder="٠"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ fontSize: 30, fontWeight: 800, textAlign: "center", padding: "12px 52px", color: isTransfer ? "#7a1d44" : form.type === "income" ? GREEN : RED }} />
              <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 18, fontWeight: 800, opacity: 0.5 }}>ج</span>
            </div>

            {!isTransfer && form.type === "income" && !editId && (
              <div style={{ marginBottom: 12 }}>
                <button className="fn-press" onClick={() => setIsDeferred((v) => !v)} style={chip(isDeferred, "#b54708")}>⏳ آجل (دفع جزئي)</button>
                {isDeferred && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>المبلغ الكبير فوق = المدفوع الآن. اكتبي الإجمالي المتفق عليه:</div>
                    <input className="fn-input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="الإجمالي" value={dTotal} onChange={(e) => setDTotal(e.target.value)} />
                    {parseFloat(dTotal) > 0 && (
                      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: "#b54708" }}>المتبقي آجل: {fmt(Math.max(0, (parseFloat(dTotal) || 0) - (parseFloat(form.amount) || 0)))}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isTransfer ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>من حساب</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {(["cash", "vodafone_cash"] as const).map((k) => (
                    <button key={k} className="fn-press" onClick={() => setTFrom(k)}
                      style={{ flex: 1, padding: "11px 8px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                        border: "1.5px solid " + (tFrom === k ? "#7a1d44" : "#f0cfdd"),
                        background: tFrom === k ? "#7a1d44" : "#fff", color: tFrom === k ? "#fff" : "#5a2a3d", transition: "all .15s" }}>
                      {MI[k]} {ML[k]}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center", fontWeight: 800, color: "#7a1d44", marginBottom: 12 }}>
                  ⬇ إلى: {MI[tFrom === "cash" ? "vodafone_cash" : "cash"]} {ML[tFrom === "cash" ? "vodafone_cash" : "cash"]}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التاريخ</div>
                <input className="fn-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ marginBottom: 12 }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التصنيف</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                  {cats.map((c) => (
                    <button key={c} className="fn-press" onClick={() => setForm({ ...form, category: c })}
                      style={chip(form.category === c, form.type === "income" ? GREEN : RED)}>
                      {iconOf(c, form.type)} {c}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>طريقة الدفع</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {(["cash", "vodafone_cash"] as const).map((k) => (
                    <button key={k} className="fn-press" onClick={() => setForm({ ...form, method: k })}
                      style={{ flex: 1, padding: "11px 8px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                        border: "1.5px solid " + (form.method === k ? "#7a1d44" : "#f0cfdd"),
                        background: form.method === k ? "#7a1d44" : "#fff", color: form.method === k ? "#fff" : "#5a2a3d", transition: "all .15s" }}>
                      {MI[k]} {ML[k]}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التاريخ</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <button className="fn-press" onClick={() => setForm({ ...form, date: today || cairoToday() })} style={chip(form.date === (today || cairoToday()))}>اليوم</button>
                  <button className="fn-press" onClick={() => setForm({ ...form, date: shiftDay(today || cairoToday(), -1) })} style={chip(form.date === shiftDay(today || cairoToday(), -1))}>أمس</button>
                  <input className="fn-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ flex: 1, padding: "8px 10px" }} />
                </div>
              </>
            )}

            <textarea className="fn-input" rows={2} maxLength={300} placeholder="وصف (اختياري)"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 10, resize: "none" }} />

            {sheetErr && <p style={{ color: RED, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{sheetErr}</p>}

            <button disabled={busy} onClick={save} className="fn-press"
              style={{ width: "100%", padding: 14, borderRadius: 16, fontWeight: 800, fontSize: 15.5, color: "#fff", opacity: busy ? 0.7 : 1,
                background: isTransfer ? "linear-gradient(135deg,#7a1d44,#c2185b)" : form.type === "income" ? "linear-gradient(135deg,#2f9e44,#51cf66)" : "linear-gradient(135deg,#e03131,#ff6b6b)",
                boxShadow: "0 8px 18px rgba(0,0,0,.15)" }}>
              {busy ? "جاري الحفظ..." : editId ? "حفظ التعديل" : isTransfer ? "تسجيل التحويل" : form.type === "income" ? "تسجيل الإيراد" : "تسجيل المصروف"}
            </button>
            <button onClick={() => setSheetOpen(false)} style={{ width: "100%", padding: 10, marginTop: 4, fontWeight: 700, opacity: 0.6 }}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
