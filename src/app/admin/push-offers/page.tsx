"use client";
import { useState } from "react";

export default function PushOffersPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/offers");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });
      const d = await r.json();
      setMsg(r.ok ? "تم الإرسال لـ " + d.sent + " من " + d.total : "فشل الإرسال");
    } catch {
      setMsg("فشل الإرسال");
    }
    setBusy(false);
  }

  const f = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginBottom: 10 } as const;
  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>إرسال عرض للعملاء</h1>
      <input style={f} placeholder="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea style={f} rows={3} placeholder="نص العرض" value={body} onChange={(e) => setBody(e.target.value)} />
      <input style={f} placeholder="الرابط عند الضغط" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button disabled={busy || !title || !body} onClick={send} style={{ width: "100%", padding: 12, borderRadius: 12, border: 0, background: "#d6336c", color: "#fff", fontWeight: 700 }}>
        {busy ? "جاري الإرسال..." : "إرسال لكل المشتركين"}
      </button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
