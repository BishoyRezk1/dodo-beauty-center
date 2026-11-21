"use client";
import { useState } from "react";

const TAGS = "\n\n#ZinaNails #جمالك_تفاصيله_بتفرق";

export default function FacebookPostPage() {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("message", message);
      if (link) fd.append("link", link);
      if (imageUrl) fd.append("imageUrl", imageUrl);
      if (scheduleAt) fd.append("scheduleAt", new Date(scheduleAt).toISOString());
      if (file) fd.append("image", file);
      const r = await fetch("/api/admin/facebook", { method: "POST", body: fd });
      const d = await r.json();
      setResult(d);
      if (d.ok) {
        setMessage("");
        setImageUrl("");
        setLink("");
        setScheduleAt("");
        setFile(null);
      }
    } catch {
      setResult({ ok: false, error: "مشكلة في الاتصال" });
    }
    setBusy(false);
  }

  const box = { width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10, marginBottom: 12 } as const;

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>النشر على فيسبوك</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={7}
        placeholder="اكتبي نص البوست..."
        style={box}
      />
      <button type="button" onClick={() => setMessage((m) => m + TAGS)} style={{ marginBottom: 12, fontSize: 13 }}>
        + إضافة الهاشتاجات
      </button>

      <label style={{ display: "block", marginBottom: 4 }}>صورة من الجهاز (حتى 4MB)</label>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={box} />

      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="أو رابط صورة (مثال: صورة خدمة من الموقع)"
        style={box}
        dir="ltr"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="رابط لإرفاقه (بدون صورة فقط)"
        style={box}
        dir="ltr"
      />

      <label style={{ display: "block", marginBottom: 4 }}>جدولة (اختياري)</label>
      <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} style={box} />

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        style={{ width: "100%", padding: 12, borderRadius: 10, background: "#1877f2", color: "#fff", fontWeight: 700 }}
      >
        {busy ? "جاري النشر..." : scheduleAt ? "جدولة البوست" : "انشر الآن"}
      </button>

      {result && (
        <p style={{ marginTop: 12, color: result.ok ? "green" : "crimson" }}>
          {result.ok ? (
            <>
              {result.scheduled ? "تمت الجدولة ✅ " : "تم النشر ✅ "}
              <a href={result.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                فتح البوست
              </a>
            </>
          ) : (
            result.error
          )}
        </p>
      )}
    </div>
  );
}
