"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type St = {
  code: string; name: string; status: "OK" | "NO_OPENING" | "BEFORE_START"; startDate?: string;
  opening?: number; receipts?: number; payments?: number; transfersIn?: number; transfersOut?: number; closing?: number;
};

const PINK = "#c2185b";
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const shift = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00.000Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const card: CSSProperties = { background: "#fff", border: "1px solid #f3c4d5", borderRadius: 16, padding: 14, marginBottom: 12 };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", padding: "5px 0" };
const nav: CSSProperties = { height: 44, minWidth: 44, border: "1px solid " + PINK, borderRadius: 12, background: "#fff", color: PINK, fontWeight: 800, fontFamily: "inherit", fontSize: 16 };

export default function DailyClosePage() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<St[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async (d: string) => {
    setData(null);
    setErr("");
    try {
      const r = await fetch(`/api/admin/daily-statement?date=${d}`);
      const j = await r.json().catch(() => ({}));
      if (r.ok) setData((j.accounts ?? []) as St[]);
      else { setData([]); setErr(j.error ?? "تعذر التحميل"); }
    } catch {
      setData([]);
      setErr("تعذر الاتصال");
    }
  }, []);
  useEffect(() => { load(date); }, [date, load]);

  const ok = (data ?? []).filter((x) => x.status === "OK");
  const sum = (k: "opening" | "receipts" | "payments" | "closing") => ok.reduce((a, x) => a + (x[k] ?? 0), 0);

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 120px" }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, color: "#5a1535", margin: "0 0 12px" }}>إغلاق اليوم</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" style={nav} onClick={() => setDate(shift(date, -1))} aria-label="اليوم السابق">›</button>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ flex: 1, height: 44, border: "1px solid #f3c4d5", borderRadius: 12, padding: "0 12px", fontSize: 15, background: "#fff", fontFamily: "inherit" }} />
        <button type="button" style={nav} onClick={() => setDate(shift(date, 1))} aria-label="اليوم التالي">‹</button>
      </div>
      {err && <div style={{ ...card, color: "#b42318" }}>{err}</div>}
      {data === null ? <div style={{ padding: 30, textAlign: "center" }}>جاري التحميل...</div> : data.map((a) => (
        <div key={a.code} style={card}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{a.name}</div>
          {a.status === "NO_OPENING" && <div style={{ opacity: 0.75 }}>اعتمد الرصيد الافتتاحي أولًا من «الخزينة والحسابات».</div>}
          {a.status === "BEFORE_START" && <div style={{ opacity: 0.75 }}>هذا التاريخ قبل بداية المحاسبة ({a.startDate}).</div>}
          {a.status === "OK" && (
            <>
              <div style={row}><span style={{ opacity: 0.7 }}>افتتاحي اليوم (ختامي أمس)</span><b>{fmt(a.opening ?? 0)}</b></div>
              <div style={row}><span style={{ opacity: 0.7 }}>المقبوضات</span><b style={{ color: "#1b7f4b" }}>{fmt(a.receipts ?? 0)}</b></div>
              <div style={row}><span style={{ opacity: 0.7 }}>المدفوعات</span><b style={{ color: "#b42318" }}>{fmt(a.payments ?? 0)}</b></div>
              <div style={row}><span style={{ opacity: 0.7 }}>تحويلات واردة / صادرة</span><b>{fmt(a.transfersIn ?? 0)} / {fmt(a.transfersOut ?? 0)}</b></div>
              <div style={{ ...row, borderTop: "1px solid #fbe3ec", marginTop: 4, paddingTop: 8 }}><b>الختامي (يرحّل لبكرة)</b><b style={{ fontSize: 17 }}>{fmt(a.closing ?? 0)}</b></div>
            </>
          )}
        </div>
      ))}
      {ok.length > 1 && (
        <div style={{ ...card, background: "#fff8fb" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>الإجمالي</div>
          <div style={row}><span style={{ opacity: 0.7 }}>افتتاحي</span><b>{fmt(sum("opening"))}</b></div>
          <div style={row}><span style={{ opacity: 0.7 }}>مقبوضات − مدفوعات</span><b>{fmt(sum("receipts") - sum("payments"))}</b></div>
          <div style={row}><b>ختامي</b><b>{fmt(sum("closing"))}</b></div>
        </div>
      )}
      <button type="button" onClick={() => window.print()} style={{ ...nav, width: "100%", marginTop: 4, fontSize: 15 }}>طباعة</button>
      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.7, marginTop: 12 }}>
        افتتاحي كل يوم = ختامي اليوم السابق تلقائيًا (الرصيد الدفتري). التواريخ بتوقيت القاهرة. التحويل بين الحسابين لا يعتبر إيرادًا ولا مصروفًا.
      </div>
    </div>
  );
}
