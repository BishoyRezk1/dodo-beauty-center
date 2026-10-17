"use client";
import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string; type: "income" | "expense"; amount: number; category: string;
  method: "cash" | "vodafone_cash"; date: string; description: string | null;
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
const ML = { cash: "نقدي", vodafone_cash: "Vodafone Cash" };
const H = { "Content-Type": "application/json" };
const GREEN = "#2b8a3e";
const RED = "#c92a2a";
const ZERO: Bucket = { income: 0, expense: 0, net: 0 };

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const cairoToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const netColor = (n: number) => (n >= 0 ? GREEN : RED);

const card = { border: "1px solid #f3d6e4", borderRadius: 14, padding: 12, background: "#fff" } as const;

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: color || "inherit" }}>{fmt(value)}</div>
    </div>
  );
}

export default function FinancePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [totals, setTotals] = useState<Bucket>(ZERO);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ type: "income", amount: "", category: "", method: "cash", date: "", description: "" });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ftype, setFtype] = useState("");
  const [fmethod, setFmethod] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { setForm((f) => ({ ...f, date: cairoToday() })); }, []);

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

  function resetForm() {
    setEditId(null);
    setForm((f) => ({ ...f, amount: "", category: "", description: "" }));
  }

  async function save() {
    setMsg("");
    const amt = parseFloat(form.amount);
    if (!(amt > 0) || !form.category || !form.date) { setMsg("كمّل المبلغ والتصنيف والتاريخ"); return; }
    setBusy(true);
    try {
      const r = await fetch(editId ? "/api/admin/finance/" + editId : "/api/admin/finance", {
        method: editId ? "PATCH" : "POST",
        headers: H,
        body: JSON.stringify({ ...form, amount: amt }),
      });
      if (!r.ok) setMsg("فشل الحفظ");
      else { setMsg(editId ? "تم التعديل" : "تم الحفظ"); resetForm(); await load(); }
    } catch {
      setMsg("حصل خطأ في الاتصال");
    }
    setBusy(false);
  }

  function edit(e: Entry) {
    setEditId(e.id); setMsg("");
    setForm({ type: e.type, amount: String(e.amount), category: e.category, method: e.method, date: e.date, description: e.description || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(e: Entry) {
    if (!confirm("حذف العملية دي نهائياً؟ " + e.category + " — " + fmt(e.amount))) return;
    const r = await fetch("/api/admin/finance/" + e.id, { method: "DELETE" });
    setMsg(r.ok ? "تم الحذف" : "فشل الحذف");
    if (editId === e.id) resetForm();
    await load();
  }

  const baseCats = CATS[form.type];
  const cats = !form.category || baseCats.includes(form.category) ? baseCats : [...baseCats, form.category];
  const s = summary;
  const tAll = s?.today.all || ZERO;
  const mAll = s?.month.all || ZERO;

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>الإيرادات والمصروفات</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Stat label="إيرادات اليوم" value={tAll.income} color={GREEN} />
        <Stat label="مصروفات اليوم" value={tAll.expense} color={RED} />
        <Stat label="صافي اليوم" value={tAll.net} color={netColor(tAll.net)} />
        <Stat label="صافي الشهر" value={mAll.net} color={netColor(mAll.net)} />
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
        {(["cash", "vodafone_cash"] as const).map((k) => {
          const t = s?.today[k] || ZERO;
          const m = s?.month[k] || ZERO;
          return (
            <div key={k} style={card}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{ML[k]}</div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                اليوم: <span style={{ color: GREEN }}>+{fmt(t.income)}</span> · <span style={{ color: RED }}>-{fmt(t.expense)}</span> · صافي <b style={{ color: netColor(t.net) }}>{fmt(t.net)}</b>
              </div>
              <div style={{ fontSize: 13 }}>
                الشهر: <span style={{ color: GREEN }}>+{fmt(m.income)}</span> · <span style={{ color: RED }}>-{fmt(m.expense)}</span> · صافي <b style={{ color: netColor(m.net) }}>{fmt(m.net)}</b>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 16 }}>
        الأرقام دي صافي العمليات المسجّلة بس، مش رصيد الخزينة الفعلي (مفيش رصيد افتتاحي ولا مطابقة جرد).
      </p>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{editId ? "تعديل عملية" : "عملية جديدة"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(["income", "expense"] as const).map((t) => (
            <button key={t} onClick={() => setForm({ ...form, type: t, category: "" })}
              style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, border: "1px solid #ddd",
                background: form.type === t ? (t === "income" ? GREEN : RED) : "#fff",
                color: form.type === t ? "#fff" : "#222" }}>
              {t === "income" ? "إيراد" : "مصروف"}
            </button>
          ))}
        </div>
        <input className="input-field" type="number" inputMode="decimal" step="0.01" min="0" placeholder="المبلغ"
          value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ marginBottom: 8 }} />
        <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ marginBottom: 8 }}>
          <option value="">اختاري التصنيف</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(["cash", "vodafone_cash"] as const).map((k) => (
            <button key={k} onClick={() => setForm({ ...form, method: k })}
              style={{ flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, border: "1px solid #ddd",
                background: form.method === k ? "#222" : "#fff", color: form.method === k ? "#fff" : "#222" }}>
              {ML[k]}
            </button>
          ))}
        </div>
        <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ marginBottom: 8 }} />
        <textarea className="input-field" rows={2} maxLength={300} placeholder="وصف (اختياري)"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "جاري الحفظ..." : editId ? "حفظ التعديل" : "حفظ"}</button>
          {editId && <button className="btn-secondary" onClick={resetForm}>إلغاء</button>}
        </div>
        {msg && <p style={{ marginTop: 8, fontSize: 14 }}>{msg}</p>}
      </div>

      <div style={{ fontWeight: 700, marginBottom: 8 }}>سجل العمليات</div>
      <input className="input-field" placeholder="بحث في الوصف أو التصنيف" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select className="input-field" value={ftype} onChange={(e) => setFtype(e.target.value)}>
          <option value="">الكل</option>
          <option value="income">إيرادات</option>
          <option value="expense">مصروفات</option>
        </select>
        <select className="input-field" value={fmethod} onChange={(e) => setFmethod(e.target.value)}>
          <option value="">كل الطرق</option>
          <option value="cash">نقدي</option>
          <option value="vodafone_cash">Vodafone Cash</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <input className="input-field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input-field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
        لو التواريخ فاضية بيتعرض الشهر الحالي.
        {(from || to || ftype || fmethod || q) && (
          <button onClick={() => { setFrom(""); setTo(""); setFtype(""); setFmethod(""); setQ(""); }} style={{ marginRight: 8, textDecoration: "underline" }}>مسح الفلاتر</button>
        )}
      </p>

      <div style={{ ...card, marginBottom: 10, fontSize: 13 }}>
        إجمالي النتائج: <span style={{ color: GREEN }}>+{fmt(totals.income)}</span> · <span style={{ color: RED }}>-{fmt(totals.expense)}</span> · صافي <b style={{ color: netColor(totals.net) }}>{fmt(totals.net)}</b>
      </div>

      {err && <p style={{ color: RED, marginBottom: 8 }}>{err}</p>}
      {loading && <p style={{ opacity: 0.6 }}>جاري التحميل...</p>}
      {!loading && !err && entries.length === 0 && <p style={{ opacity: 0.6 }}>مفيش عمليات في الفترة دي.</p>}
      {truncated && <p style={{ fontSize: 12, color: RED }}>معروض أحدث 500 عملية بس، ضيّقي الفلتر.</p>}

      {entries.map((e) => (
        <div key={e.id} style={{ ...card, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{e.category}</div>
            <div style={{ fontWeight: 800, color: e.type === "income" ? GREEN : RED }}>
              {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, margin: "2px 0" }}>
            {new Date(e.date + "T12:00:00Z").toLocaleDateString("ar-EG")} · {ML[e.method]} · {e.type === "income" ? "إيراد" : "مصروف"}
          </div>
          {e.description && <div style={{ fontSize: 13, marginBottom: 6 }}>{e.description}</div>}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => edit(e)} style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 13, fontWeight: 700 }}>تعديل</button>
            <button onClick={() => remove(e)} style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 13, fontWeight: 700, color: RED }}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
