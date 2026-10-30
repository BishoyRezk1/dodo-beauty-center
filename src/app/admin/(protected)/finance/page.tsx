"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Entry = {
  id: string; type: "income" | "expense"; amount: number; category: string;
  method: "cash" | "vodafone_cash"; date: string; description: string | null;
  source?: "LEDGER" | "INVOICE"; invoiceNo?: number;
};
type Bucket = { income: number; expense: number; net: number };
type Summary = { today: Record<string, Bucket>; month: Record<string, Bucket> };
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
  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
  border: "1.5px solid " + (on ? color : "#f0cfdd"),
  background: on ? color : "#fff", color: on ? "#fff" : "#5a2a3d",
  transition: "all .15s",
});

const CSS = `
.fn-card{background:#fff;border:1px solid #f6dbe7;border-radius:20px;box-shadow:0 6px 18px rgba(194,24,91,.06)}
.fn-input{width:100%;border:1.5px solid #f0cfdd;border-radius:14px;padding:12px 14px;font-size:16px;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;color:#2b1a22}
.fn-input:focus{border-color:#c2185b;box-shadow:0 0 0 3px rgba(194,24,91,.12)}
.fn-press:active{transform:scale(.96)}
.fn-press{transition:transform .12s}
.fn-overlay{position:fixed;inset:0;background:rgba(40,10,25,.5);z-index:9998;display:flex;align-items:flex-end;justify-content:center;animation:fn-fade .2s ease}
.fn-sheet{background:#fff8fb;width:100%;max-width:560px;max-height:92dvh;overflow-y:auto;border-radius:28px 28px 0 0;padding:14px 18px calc(22px + env(safe-area-inset-bottom,0px));animation:fn-up .25s ease}
.fn-fab{position:fixed;left:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:9000;border:0;border-radius:999px;padding:15px 22px;color:#fff;font-weight:800;font-size:15px;background:linear-gradient(135deg,#c2185b,#ec6b9a);box-shadow:0 12px 26px rgba(194,24,91,.4)}
.fn-toast{position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:10001;background:#2b1a22;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:700;animation:fn-fade .2s ease;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.fn-sk{background:linear-gradient(90deg,#f7e3ec 25%,#fdf0f5 50%,#f7e3ec 75%);background-size:200% 100%;animation:fn-sh 1.2s infinite;border-radius:20px}
@keyframes fn-fade{from{opacity:0}to{opacity:1}}
@keyframes fn-up{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
@keyframes fn-sh{from{background-position:200% 0}to{background-position:-200% 0}}
`;

export default function FinancePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [tFrom, setTFrom] = useState<"cash" | "vodafone_cash">("cash");
  const [tKey, setTKey] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ftype, setFtype] = useState("");
  const [fmethod, setFmethod] = useState("");
  const [q, setQ] = useState("");

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
      setEntries(d.entries); setSummary(d.summary); setTotals(d.totals); setTruncated(!!d.truncated);
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
    setIsTransfer(false);
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
    if (!(amt > 0)) { setSheetErr("اكتبي مبلغ صحيح"); return; }
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
      if (!r.ok) setSheetErr("فشل الحفظ، حاولي تاني");
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

  const baseCats = CATS[form.type];
  const cats = !form.category || baseCats.includes(form.category) ? baseCats : [...baseCats, form.category];
  const tAll = summary?.today.all || ZERO;
  const mAll = summary?.month.all || ZERO;
  const mTotal = mAll.income + mAll.expense;
  const incPct = mTotal > 0 ? (mAll.income / mTotal) * 100 : 50;
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
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 120px" }}>
      <style>{CSS}</style>
      {toast && <div className="fn-toast">{toast}</div>}

      <div style={{ marginBottom: 14 }}>
        <h1 className="font-display" style={{ fontWeight: 800, fontSize: 24, color: "#5a1535", lineHeight: 1.3 }}>الإيرادات والمصروفات</h1>
        <div style={{ fontSize: 13, opacity: 0.6 }}>{dateLabel}</div>
      </div>

      {!summary ? (
        <>
          <div className="fn-sk" style={{ height: 170, marginBottom: 12 }} />
          <div className="fn-sk" style={{ height: 90, marginBottom: 12 }} />
        </>
      ) : (
        <>
          <div style={{
            background: "linear-gradient(135deg,#7a1d44 0%,#c2185b 55%,#ec6b9a 100%)",
            borderRadius: 24, padding: 20, color: "#fff", position: "relative", overflow: "hidden",
            boxShadow: "0 14px 30px rgba(194,24,91,.28)", marginBottom: 12,
          }}>
            <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.10)" }} />
            <div style={{ position: "absolute", bottom: -60, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>صافي الشهر</div>
              <div className="font-display" style={{ fontSize: 38, fontWeight: 800, margin: "4px 0 14px" }}>{fmtS(mAll.net)}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,.16)", borderRadius: 14, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>↑ إيرادات الشهر</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{fmt(mAll.income)}</div>
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,.16)", borderRadius: 14, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>↓ مصروفات الشهر</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{fmt(mAll.expense)}</div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,.28)", overflow: "hidden" }}>
                <div style={{ width: incPct + "%", height: "100%", background: "#fff", borderRadius: 6, transition: "width .4s" }} />
              </div>
            </div>
          </div>

          <div className="fn-card" style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: "#5a1535" }}>اليوم</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>إيراد</div>
                <div style={{ fontWeight: 800, color: GREEN, fontSize: 15 }}>{fmt(tAll.income)}</div>
              </div>
              <div style={{ borderInline: "1px solid #f6dbe7" }}>
                <div style={{ fontSize: 12, opacity: 0.6 }}>مصروف</div>
                <div style={{ fontWeight: 800, color: RED, fontSize: 15 }}>{fmt(tAll.expense)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>صافي</div>
                <div style={{ fontWeight: 800, color: netColor(tAll.net), fontSize: 15 }}>{fmtS(tAll.net)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
            {(["cash", "vodafone_cash"] as const).map((k) => {
              const t = summary.today[k] || ZERO;
              const m = summary.month[k] || ZERO;
              const tot = m.income + m.expense;
              const pct = tot > 0 ? (m.income / tot) * 100 : 50;
              return (
                <div key={k} className="fn-card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: "#fdeaf2", display: "grid", placeItems: "center", fontSize: 20 }}>{MI[k]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{ML[k]}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>صافي الشهر</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: netColor(m.net) }}>{fmtS(m.net)}</div>
                  </div>
                  <div style={{ height: 7, borderRadius: 7, background: "#fde0e0", overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: pct + "%", height: "100%", background: GREEN, borderRadius: 7 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: GREEN, fontWeight: 700 }}>↑ {fmt(m.income)}</span>
                    <span style={{ color: RED, fontWeight: 700 }}>↓ {fmt(m.expense)}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
                    اليوم: <b style={{ color: netColor(t.net) }}>{fmtS(t.net)}</b>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, background: "#fff3f8", border: "1px dashed #f0b7cf", borderRadius: 14, padding: "10px 12px", fontSize: 12, opacity: 0.85, marginBottom: 16 }}>
            <span>ℹ️</span>
            <span>الأرقام دي صافي العمليات المسجّلة بس، مش رصيد الخزينة الفعلي (مفيش رصيد افتتاحي ولا مطابقة جرد).</span>
          </div>
        </>
      )}

      {breakdown.arr.length > 0 && (
        <div className="fn-card" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: "#5a1535" }}>أين راحت المصروفات</div>
          <div style={{ display: "grid", gap: 10 }}>
            {breakdown.arr.map(([c, v]) => (
              <div key={c}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{iconOf(c, "expense")} {c}</span>
                  <span style={{ fontWeight: 700 }}>{fmt(v)} · {Math.round((v / breakdown.total) * 100).toLocaleString("ar-EG")}٪</span>
                </div>
                <div style={{ height: 7, borderRadius: 7, background: "#fdecef", overflow: "hidden" }}>
                  <div style={{ width: (v / breakdown.max) * 100 + "%", height: "100%", borderRadius: 7, background: "linear-gradient(90deg,#e03131,#f08fb0)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#5a1535", flex: 1 }}>سجل العمليات</div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} className="fn-press"
            style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid #f0cfdd", background: menuOpen ? "#fdeaf2" : "#fff", fontWeight: 700, fontSize: 13 }}>
            ☰ المزيد
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div className="fn-card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, minWidth: 220, padding: 6, background: "#fff", boxShadow: "0 14px 30px rgba(90,21,53,.22)", borderRadius: 16 }}>
                {[
                  ["/admin/accounts", "🏦", "الأرصدة والتحويلات"],
                  ["/admin/archive", "🗂️", "الأرشيف الشهري"],
                  ["/admin/daily-close", "📒", "إغلاق اليوم"],
                  ["/admin/invoices", "🧾", "المبيعات والفواتير"],
                ].map(([href, ic, label]) => (
                  <a key={href} href={href} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5a1535", textDecoration: "none" }}>
                    <span>{ic}</span><span>{label}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="fn-press"
          style={{ position: "relative", padding: "8px 14px", borderRadius: 999, border: "1.5px solid #f0cfdd", background: showFilters ? "#fdeaf2" : "#fff", fontWeight: 700, fontSize: 13 }}>
          🎚️ فلاتر
          {activeFilters && <span style={{ position: "absolute", top: 4, left: 6, width: 8, height: 8, borderRadius: "50%", background: ROSE }} />}
        </button>
      </div>

      <input className="fn-input" placeholder="🔍 بحث في الوصف أو التصنيف" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />

      {showFilters && (
        <div className="fn-card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[["", "الكل"], ["income", "إيرادات"], ["expense", "مصروفات"]].map(([v, l]) => (
              <button key={v} className="fn-press" onClick={() => setFtype(v)} style={chip(ftype === v)}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[["", "كل الطرق"], ["cash", "💵 نقدي"], ["vodafone_cash", "📱 Vodafone Cash"]].map(([v, l]) => (
              <button key={v} className="fn-press" onClick={() => setFmethod(v)} style={chip(fmethod === v, "#7a1d44")}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <label style={{ flex: 1, fontSize: 12, opacity: 0.7 }}>من
              <input className="fn-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label style={{ flex: 1, fontSize: 12, opacity: 0.7 }}>إلى
              <input className="fn-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, opacity: 0.7 }}>
            <span>لو التواريخ فاضية بيتعرض الشهر الحالي.</span>
            {(activeFilters || q) && (
              <button onClick={() => { setFrom(""); setTo(""); setFtype(""); setFmethod(""); setQ(""); }} style={{ textDecoration: "underline", fontWeight: 700 }}>مسح الكل</button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12.5, padding: "0 4px 10px", opacity: 0.85 }}>
        <span>{entries.length.toLocaleString("ar-EG")} عملية</span>
        <span>
          <b style={{ color: GREEN }}>+{fmt(totals.income)}</b> · <b style={{ color: RED }}>-{fmt(totals.expense)}</b> · صافي <b style={{ color: netColor(totals.net) }}>{fmt(totals.net)}</b>
        </span>
      </div>

      {err && <p style={{ color: RED, marginBottom: 8, fontWeight: 700 }}>{err}</p>}
      {loading && entries.length === 0 && <div className="fn-sk" style={{ height: 90 }} />}
      {truncated && <p style={{ fontSize: 12, color: RED, marginBottom: 8 }}>معروض أحدث 500 عملية بس، ضيّقي الفلتر.</p>}

      {!loading && !err && entries.length === 0 && (
        <div className="fn-card" style={{ padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>📒</div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>مفيش عمليات في الفترة دي</div>
          <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 14 }}>سجّلي أول إيراد أو مصروف وهيظهر هنا.</div>
          <button onClick={openNew} className="fn-press" style={{ ...chip(true), padding: "10px 20px" }}>＋ عملية جديدة</button>
        </div>
      )}

      {groups.map(([d, list]) => {
        const dayNet = list.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0);
        return (
          <div key={d} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 6px", fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: "#5a1535" }}>{dayLabel(d, today)}</span>
              <span style={{ fontWeight: 800, color: netColor(dayNet) }}>{fmtS(Math.round(dayNet * 100) / 100)}</span>
            </div>
            <div className="fn-card" style={{ overflow: "hidden" }}>
              {list.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderTop: i ? "1px solid #fbeaf1" : "none" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: e.type === "income" ? "#e9f7ee" : "#fdecec", display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>
                    {iconOf(e.category, e.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>{e.category}</div>
                    {e.description && (
                      <div style={{ fontSize: 12.5, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.description}</div>
                    )}
                    <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 700, background: "#fdf0f5", color: "#7a1d44", padding: "2px 8px", borderRadius: 999 }}>
                      {MI[e.method]} {ML[e.method]}
                    </span>
                  </div>
                  <div style={{ textAlign: "left", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5, color: e.type === "income" ? GREEN : RED }}>
                      {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                    </div>
                    {e.source === "INVOICE" ? (
                      <a href="/admin/invoices" style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, fontWeight: 800, color: "#7a1d44", background: "#fdf0f5", padding: "5px 10px", borderRadius: 999 }}>🧾 فاتورة #{e.invoiceNo}</a>
                    ) : (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => openEdit(e)} className="fn-press" aria-label="تعديل"
                        style={{ width: 30, height: 30, borderRadius: 10, background: "#fdf0f5", fontSize: 14 }}>✏️</button>
                      <button onClick={() => remove(e)} className="fn-press" aria-label="حذف"
                        style={{ width: 30, height: 30, borderRadius: 10, background: "#fdecec", fontSize: 14 }}>🗑️</button>
                    </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!sheetOpen && <button className="fn-fab fn-press" onClick={openNew}>＋ عملية جديدة</button>}

      {sheetOpen && (
        <div className="fn-overlay" onClick={() => setSheetOpen(false)}>
          <div className="fn-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 44, height: 5, borderRadius: 5, background: "#e8c3d3", margin: "0 auto 14px" }} />
            <div className="font-display" style={{ fontWeight: 800, fontSize: 19, marginBottom: 12, color: "#5a1535" }}>
              {editId ? "تعديل عملية" : "عملية جديدة"}
            </div>

            <div style={{ display: "flex", gap: 4, background: "#fdeaf2", padding: 4, borderRadius: 16, marginBottom: 14 }}>
              {(["income", "expense"] as const).map((t) => (
                <button key={t} className="fn-press" onClick={() => { setIsTransfer(false); setForm({ ...form, type: t, category: "" }); }}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontWeight: 800, fontSize: 15,
                    background: !isTransfer && form.type === t ? (t === "income" ? GREEN : RED) : "transparent",
                    color: !isTransfer && form.type === t ? "#fff" : "#7a1d44", transition: "all .15s" }}>
                  {t === "income" ? "↑ إيراد" : "↓ مصروف"}
                </button>
              ))}
              {!editId && (
                <button className="fn-press" onClick={() => { setIsTransfer(true); setSheetErr(""); if (!tKey) setTKey(crypto.randomUUID()); }}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 12, fontWeight: 800, fontSize: 15,
                    background: isTransfer ? "#7a1d44" : "transparent",
                    color: isTransfer ? "#fff" : "#7a1d44", transition: "all .15s" }}>
                  ⇄ تحويل
                </button>
              )}
            </div>

            <div style={{ position: "relative", marginBottom: 14 }}>
              <input className="fn-input" type="number" inputMode="decimal" step="0.01" min="0" placeholder="٠"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ fontSize: 34, fontWeight: 800, textAlign: "center", padding: "16px 56px", color: isTransfer ? "#7a1d44" : form.type === "income" ? GREEN : RED }} />
              <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 18, fontWeight: 800, opacity: 0.5 }}>ج</span>
            </div>

            {isTransfer ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>من حساب</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {(["cash", "vodafone_cash"] as const).map((k) => (
                    <button key={k} className="fn-press" onClick={() => setTFrom(k)}
                      style={{ flex: 1, padding: "12px 8px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                        border: "1.5px solid " + (tFrom === k ? "#7a1d44" : "#f0cfdd"),
                        background: tFrom === k ? "#7a1d44" : "#fff", color: tFrom === k ? "#fff" : "#5a2a3d", transition: "all .15s" }}>
                      {MI[k]} {ML[k]}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center", fontWeight: 800, color: "#7a1d44", marginBottom: 14 }}>
                  ⬇ إلى: {MI[tFrom === "cash" ? "vodafone_cash" : "cash"]} {ML[tFrom === "cash" ? "vodafone_cash" : "cash"]}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التاريخ</div>
                <input className="fn-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ marginBottom: 14 }} />
              </>
            ) : (
              <>
            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التصنيف</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {cats.map((c) => (
                <button key={c} className="fn-press" onClick={() => setForm({ ...form, category: c })}
                  style={chip(form.category === c, form.type === "income" ? GREEN : RED)}>
                  {iconOf(c, form.type)} {c}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>طريقة الدفع</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["cash", "vodafone_cash"] as const).map((k) => (
                <button key={k} className="fn-press" onClick={() => setForm({ ...form, method: k })}
                  style={{ flex: 1, padding: "12px 8px", borderRadius: 14, fontWeight: 800, fontSize: 14,
                    border: "1.5px solid " + (form.method === k ? "#7a1d44" : "#f0cfdd"),
                    background: form.method === k ? "#7a1d44" : "#fff", color: form.method === k ? "#fff" : "#5a2a3d", transition: "all .15s" }}>
                  {MI[k]} {ML[k]}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>التاريخ</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
              <button className="fn-press" onClick={() => setForm({ ...form, date: today || cairoToday() })} style={chip(form.date === (today || cairoToday()))}>اليوم</button>
              <button className="fn-press" onClick={() => setForm({ ...form, date: shiftDay(today || cairoToday(), -1) })} style={chip(form.date === shiftDay(today || cairoToday(), -1))}>أمس</button>
              <input className="fn-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ flex: 1, padding: "9px 12px" }} />
            </div>

            </>
            )}

            <textarea className="fn-input" rows={2} maxLength={300} placeholder="وصف (اختياري)"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 12, resize: "none" }} />

            {sheetErr && <p style={{ color: RED, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{sheetErr}</p>}

            <button disabled={busy} onClick={save} className="fn-press"
              style={{ width: "100%", padding: 16, borderRadius: 16, fontWeight: 800, fontSize: 16, color: "#fff", opacity: busy ? 0.7 : 1,
                background: isTransfer ? "linear-gradient(135deg,#7a1d44,#c2185b)" : form.type === "income" ? "linear-gradient(135deg,#2f9e44,#51cf66)" : "linear-gradient(135deg,#e03131,#ff6b6b)",
                boxShadow: "0 10px 22px rgba(0,0,0,.15)" }}>
              {busy ? "جاري الحفظ..." : editId ? "حفظ التعديل" : isTransfer ? "تسجيل التحويل" : form.type === "income" ? "تسجيل الإيراد" : "تسجيل المصروف"}
            </button>
            <button onClick={() => setSheetOpen(false)} style={{ width: "100%", padding: 12, marginTop: 6, fontWeight: 700, opacity: 0.6 }}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
