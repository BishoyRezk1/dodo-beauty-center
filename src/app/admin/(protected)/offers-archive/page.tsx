"use client";
import { useCallback, useEffect, useState } from "react";

type Offer = {
  id: string; title: string; details: string | null;
  oldPrice: string | number; newPrice: string | number;
  startDate: string; endDate: string; archivedAt: string | null;
};
type Tab = "active" | "ended" | "archived";
const H = { "Content-Type": "application/json" };

function d10(s: string) {
  const d = new Date(s);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function OffersArchivePage() {
  const [tab, setTab] = useState<Tab>("active");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/offers-archive?tab=" + tab);
    if (r.ok) setOffers(await r.json());
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function edit(o: Offer) {
    setEditId(o.id); setTitle(o.title); setDetails(o.details || "");
    setOldPrice(String(o.oldPrice)); setNewPrice(String(o.newPrice));
    setStart(d10(o.startDate)); setEnd(d10(o.endDate));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditId(null); setMsg(""); }

  async function save() {
    if (!editId) return;
    const r = await fetch("/api/admin/offers-archive/" + editId, {
      method: "PATCH", headers: H,
      body: JSON.stringify({
        title, details, oldPrice, newPrice,
        startDate: new Date(start + "T00:00:00").toISOString(),
        endDate: new Date(end + "T23:59:59").toISOString(),
      }),
    });
    setMsg(r.ok ? "تم الحفظ" : "فشل الحفظ");
    if (r.ok) { setEditId(null); await load(); }
  }

  async function act(o: Offer, action: "archive" | "restore") {
    await fetch("/api/admin/offers-archive/" + o.id, { method: "PATCH", headers: H, body: JSON.stringify({ action }) });
    await load();
  }

  async function duplicate(o: Offer) {
    const r = await fetch("/api/admin/offers-archive", { method: "POST", headers: H, body: JSON.stringify({ duplicateFrom: o.id }) });
    if (!r.ok) { setMsg("فشل النسخ"); return; }
    const c: Offer = await r.json();
    setTab("active");
    edit(c);
    setMsg("اتنسخ العرض لمدة 7 أيام، عدّل التواريخ والسعر واحفظ");
  }

  async function remove(o: Offer) {
    if (!confirm("حذف نهائي؟")) return;
    await fetch("/api/admin/offers-archive/" + o.id, { method: "DELETE" });
    await load();
  }

  const f = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginBottom: 10 } as const;
  const btn = (on: boolean, danger = false) => ({
    padding: "8px 12px", borderRadius: 10, fontWeight: 700, fontSize: 13,
    border: on ? 0 : "1px solid #ddd", background: on ? "#222" : "#fff",
    color: on ? "#fff" : danger ? "#c92a2a" : "#222",
  }) as const;
  const tabs: [Tab, string][] = [["active", "الحالية"], ["ended", "المنتهية"], ["archived", "الأرشيف"]];

  return (
    <div dir="rtl" style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>أرشيف العروض</h1>

      {editId && (
        <div style={{ border: "1px solid #f3d6e4", borderRadius: 14, padding: 12, marginBottom: 16, background: "#fff" }}>
          <input style={f} placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea style={f} rows={2} placeholder="التفاصيل" value={details} onChange={(e) => setDetails(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input style={f} type="number" placeholder="السعر القديم" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
            <input style={f} type="number" placeholder="السعر الجديد" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={f} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input style={f} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ ...btn(true), background: "#d6336c" }}>حفظ</button>
            <button onClick={reset} style={btn(false)}>إلغاء</button>
          </div>
        </div>
      )}
      {msg && <p style={{ marginBottom: 12 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={btn(tab === k)}>{l}</button>
        ))}
      </div>

      {offers.length === 0 && <p style={{ opacity: 0.6 }}>مفيش عروض هنا.</p>}
      {offers.map((o) => (
        <div key={o.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, marginBottom: 10, background: "#fff" }}>
          <div style={{ fontWeight: 700 }}>{o.title}</div>
          <div style={{ fontSize: 14, margin: "4px 0" }}>
            <s style={{ opacity: 0.5 }}>{String(o.oldPrice)}</s> ← <b>{String(o.newPrice)}</b> ج
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
            من {new Date(o.startDate).toLocaleDateString("ar-EG")} إلى {new Date(o.endDate).toLocaleDateString("ar-EG")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => edit(o)} style={btn(false)}>تعديل</button>
            <button onClick={() => duplicate(o)} style={btn(false)}>نسخ كعرض جديد</button>
            {tab === "archived"
              ? <button onClick={() => act(o, "restore")} style={btn(false)}>استرجاع</button>
              : <button onClick={() => act(o, "archive")} style={btn(false)}>أرشفة</button>}
            <button onClick={() => remove(o)} style={btn(false, true)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
