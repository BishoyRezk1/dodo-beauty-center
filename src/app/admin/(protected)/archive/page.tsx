"use client";
import { useEffect, useState } from "react";

type Acc = { code: string; name: string; opening: number | null; receipts: number; payments: number; transfersIn: number; transfersOut: number; closing: number | null };
type Row = { day: string; kind: string; account: string; to: string | null; amount: number; category: string; note: string | null };
type Data = { month: string; generatedAt: string; accounts: Acc[]; rows: Row[]; totals: { income: number; expense: number; net: number; transfers: number } };

const KL: Record<string, string> = { income: "إيراد", expense: "مصروف", invoice_in: "دفعة فاتورة", refund: "استرداد", transfer: "تحويل" };
const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mname = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(new Date(y, mo - 1, 1)); };
const sign = (k: string) => (k === "income" || k === "invoice_in" ? "+" : k === "expense" || k === "refund" ? "-" : "");

function buildHtml(d: Data) {
  const acc = d.accounts.map((a) => `<tr><td>${esc(a.name)}</td><td>${fmt(a.opening)}</td><td>${fmt(a.receipts)}</td><td>${fmt(a.payments)}</td><td>${fmt(a.transfersIn)}</td><td>${fmt(a.transfersOut)}</td><td>${fmt(a.closing)}</td></tr>`).join("");
  const rows = d.rows.map((r) => `<tr><td>${r.day}</td><td>${KL[r.kind] || r.kind}</td><td>${esc(r.account)}${r.to ? " إلى " + esc(r.to) : ""}</td><td>${esc(r.category)}</td><td>${sign(r.kind)}${fmt(r.amount)}</td><td>${esc(r.note || "")}</td></tr>`).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>أرشيف ${d.month}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:16px;background:#fff7fa;color:#3a1226}h1{color:#c2185b;font-size:22px}h2{font-size:17px;margin:22px 0 8px}.box{overflow-x:auto;background:#fff;border-radius:14px;border:1px solid #f0cfdd}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:8px 10px;border-bottom:1px solid #f6e1ea;text-align:right;white-space:nowrap}th{background:#fdeaf2}.g{display:grid;grid-template-columns:1fr 1fr;gap:8px}.k{background:#fff;border:1px solid #f0cfdd;border-radius:14px;padding:12px}.k b{display:block;font-size:18px;margin-top:4px}@media print{body{background:#fff}}</style></head><body><h1>أرشيف ${mname(d.month)}</h1><div class="g"><div class="k">الإيرادات<b>${fmt(d.totals.income)}</b></div><div class="k">المصروفات<b>${fmt(d.totals.expense)}</b></div><div class="k">صافي الشهر<b>${fmt(d.totals.net)}</b></div><div class="k">التحويلات<b>${fmt(d.totals.transfers)}</b></div></div><h2>الحسابات</h2><div class="box"><table><tr><th>الحساب</th><th>رصيد أول المدة</th><th>مقبوضات</th><th>مدفوعات</th><th>تحويلات واردة</th><th>تحويلات صادرة</th><th>رصيد آخر المدة</th></tr>${acc}</table></div><h2>كل الحركات (${d.rows.length})</h2><div class="box"><table><tr><th>التاريخ</th><th>النوع</th><th>الحساب</th><th>التصنيف</th><th>المبلغ</th><th>ملاحظة</th></tr>${rows}</table></div></body></html>`;
}

function download(d: Data) {
  const blob = new Blob([buildHtml(d)], { type: "text/html;charset=utf-8" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = `أرشيف-${d.month}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #f0cfdd", borderRadius: 16, padding: 14 };
const btn: React.CSSProperties = { padding: "10px 16px", borderRadius: 12, fontWeight: 800, background: "#c2185b", color: "#fff" };

export default function ArchivePage() {
  const [months, setMonths] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const now = new Date();
    const list: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
    }
    setMonths(list);
    fetch("/api/admin/archive").then((r) => r.json()).then((j) => setSaved(j.saved || [])).catch(() => {});
  }, []);

  async function open(m: string) {
    setSel(m); setData(null); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/admin/archive?month=" + m);
      const j = await r.json();
      if (!r.ok) setErr(j.error || "تعذر التحميل");
      else { setData(j.data); setIsSaved(!!j.saved); }
    } catch { setErr("حصل خطأ في الاتصال"); }
    setBusy(false);
  }

  async function save() {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: sel }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error || "تعذر الحفظ");
      else { setData(j.data); setIsSaved(true); setSaved((s) => (s.includes(sel) ? s : [...s, sel])); }
    } catch { setErr("حصل خطأ في الاتصال"); }
    setBusy(false);
  }

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800, fontSize: 22, color: "#5a1535", marginBottom: 12 }}>الأرشيف الشهري</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {months.map((m) => (
          <button key={m} onClick={() => open(m)} style={{ padding: "10px 14px", borderRadius: 14, fontWeight: 800, border: "1.5px solid " + (sel === m ? "#7a1d44" : "#f0cfdd"), background: sel === m ? "#7a1d44" : "#fff", color: sel === m ? "#fff" : "#5a2a3d" }}>
            📁 {mname(m)} {saved.includes(m) ? "✓" : ""}
          </button>
        ))}
      </div>

      {busy && <p>جاري التحميل...</p>}
      {err && <p style={{ color: "#e03131", fontWeight: 700 }}>{err}</p>}

      {data && sel && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <button style={btn} onClick={() => download(data)}>⬇ تحميل ملف {data.month}</button>
            <button style={{ ...btn, background: "#7a1d44" }} onClick={save} disabled={busy}>{isSaved ? "تحديث الأرشيف" : "حفظ في الأرشيف"}</button>
            <span style={{ opacity: 0.6, fontSize: 13 }}>{isSaved ? "نسخة محفوظة" : "عرض مباشر (لسه مش محفوظ)"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div style={card}>الإيرادات<b style={{ display: "block", fontSize: 18, color: "#2f9e44" }}>{fmt(data.totals.income)}</b></div>
            <div style={card}>المصروفات<b style={{ display: "block", fontSize: 18, color: "#e03131" }}>{fmt(data.totals.expense)}</b></div>
            <div style={card}>صافي الشهر<b style={{ display: "block", fontSize: 18 }}>{fmt(data.totals.net)}</b></div>
            <div style={card}>التحويلات<b style={{ display: "block", fontSize: 18 }}>{fmt(data.totals.transfers)}</b></div>
          </div>

          {data.accounts.map((a) => (
            <div key={a.code} style={{ ...card, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{a.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 14 }}>
                <span>رصيد أول المدة: <b>{fmt(a.opening)}</b></span>
                <span>رصيد آخر المدة: <b>{fmt(a.closing)}</b></span>
                <span>مقبوضات: {fmt(a.receipts)}</span>
                <span>مدفوعات: {fmt(a.payments)}</span>
                <span>تحويلات واردة: {fmt(a.transfersIn)}</span>
                <span>تحويلات صادرة: {fmt(a.transfersOut)}</span>
              </div>
            </div>
          ))}

          <div style={{ fontWeight: 800, margin: "14px 0 6px" }}>كل الحركات ({data.rows.length})</div>
          <div style={{ overflowX: "auto", ...card, padding: 0 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f6e1ea" }}>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.day}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{KL[r.kind] || r.kind}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.account}{r.to ? " إلى " + r.to : ""}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.category}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap", fontWeight: 800, color: sign(r.kind) === "+" ? "#2f9e44" : sign(r.kind) === "-" ? "#e03131" : "#5a2a3d" }}>{sign(r.kind)}{fmt(r.amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{r.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
