"use client";
import { useCallback, useEffect, useState } from "react";

type Offer = {
  id: string; title: string; body: string; url: string; status: string;
  timesSent: number; lastSentAt: string | null; createdAt: string;
};

const H = { "Content-Type": "application/json" };

export default function PushOffersPage() {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/offers");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/push/offers?status=" + tab);
    if (r.ok) setOffers(await r.json());
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function reset() { setEditId(null); setTitle(""); setBody(""); setUrl("/offers"); }

  async function broadcast(o: { id: string; title: string; body: string; url: string }) {
    const r = await fetch("/api/admin/push/broadcast", {
      method: "POST", headers: H,
      body: JSON.stringify({ title: o.title, body: o.body, url: o.url, offerId: o.id }),
    });
    const d = await r.json();
    setMsg(r.ok ? "تم الإرسال لـ " + d.sent + " من " + d.total : "فشل الإرسال");
  }

  async function save(sendAfter: boolean) {
    if (sendAfter && !confirm("إرسال لكل المشتركين؟")) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch(editId ? "/api/admin/push/offers/" + editId : "/api/admin/push/offers", {
        method: editId ? "PATCH" : "POST", headers: H,
        body: JSON.stringify({ title, body, url }),
      });
      if (!r.ok) { setMsg("فشل الحفظ"); }
      else {
        const o: Offer = await r.json();
        if (sendAfter) await broadcast(o); else setMsg("تم الحفظ");
        reset(); setTab("active"); await load();
      }
    } catch { setMsg("حصل خطأ"); }
    setBusy(false);
  }

  async function resend(o: Offer) {
    if (!confirm("إرسال \"" + o.title + "\" لكل المشتركين؟")) return;
    setBusy(true); setMsg("");
    try { await broadcast(o); await load(); } catch { setMsg("فشل الإرسال"); }
    setBusy(false);
  }

  async function setStatus(o: Offer, status: "active" | "archived") {
    await fetch("/api/admin/push/offers/" + o.id, { method: "PATCH", headers: H, body: JSON.stringify({ status }) });
    await load();
  }

  async function remove(o: Offer) {
    if (!confirm("حذف نهائي؟")) return;
    await fetch("/api/admin/push/offers/" + o.id, { method: "DELETE" });
    await load();
  }

  function edit(o: Offer) {
    setEditId(o.id); setTitle(o.title); setBody(o.body); setUrl(o.url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const f = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginBottom: 10 } as const;
  const btn = (bg: string, color = "#fff") => ({ padding: "8px 12px", borderRadius: 10, border: bg === "#fff" ? "1px solid #ddd" : 0, background: bg, color, fontWeight: 700, fontSize: 13 }) as const;

  return (
    <div dir="rtl" style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
        {editId ? "تعديل عرض" : "عرض جديد"}
      </h1>
      <input style={f} placeholder="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea style={f} rows={3} placeholder="نص العرض" value={body} onChange={(e) => setBody(e.target.value)} />
      <input style={f} placeholder="الرابط عند الضغط" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={busy || !title || !body} onClick={() => save(true)} style={btn("#d6336c")}>
          {editId ? "حفظ وإرسال" : "إرسال لكل المشتركين"}
        </button>
        <button disabled={busy || !title || !body} onClick={() => save(false)} style={btn("#fff", "#222")}>حفظ بدون إرسال</button>
        {editId && <button onClick={reset} style={btn("#fff", "#222")}>إلغاء التعديل</button>}
      </div>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ display: "flex", gap: 8, margin: "24px 0 12px" }}>
        <button onClick={() => setTab("active")} style={btn(tab === "active" ? "#222" : "#fff", tab === "active" ? "#fff" : "#222")}>العروض الحالية</button>
        <button onClick={() => setTab("archived")} style={btn(tab === "archived" ? "#222" : "#fff", tab === "archived" ? "#fff" : "#222")}>الأرشيف</button>
      </div>

      {offers.length === 0 && <p style={{ opacity: 0.6 }}>مفيش عروض هنا.</p>}
      {offers.map((o) => (
        <div key={o.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, marginBottom: 10, background: "#fff" }}>
          <div style={{ fontWeight: 700 }}>{o.title}</div>
          <div style={{ fontSize: 14, opacity: 0.8, margin: "4px 0" }}>{o.body}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
            اتبعت {o.timesSent} مرة
            {o.lastSentAt ? " · آخر مرة " + new Date(o.lastSentAt).toLocaleDateString("ar-EG") : ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button disabled={busy} onClick={() => resend(o)} style={btn("#d6336c")}>{o.timesSent ? "إرسال تاني" : "إرسال"}</button>
            <button onClick={() => edit(o)} style={btn("#fff", "#222")}>تعديل</button>
            {tab === "active"
              ? <button onClick={() => setStatus(o, "archived")} style={btn("#fff", "#222")}>أرشفة (انتهى)</button>
              : <button onClick={() => setStatus(o, "active")} style={btn("#fff", "#222")}>استرجاع</button>}
            <button onClick={() => remove(o)} style={btn("#fff", "#c92a2a")}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
