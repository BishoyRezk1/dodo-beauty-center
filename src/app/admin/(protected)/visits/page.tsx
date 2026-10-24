"use client";
import { useEffect, useState } from "react";

type Entry = {
  id: string; at: string; path: string; device: string | null; browser: string | null;
  os: string | null; source: string | null; country: string | null; city: string | null;
};
type Stat = { name: string; count: number };
type Data = { total: number; truncated: boolean; devices: Stat[]; sources: Stat[]; places: Stat[]; paths: Stat[]; entries: Entry[] };

const RANGES = [["today", "اليوم"], ["7d", "٧ أيام"], ["30d", "٣٠ يوم"], ["all", "الكل"]] as const;
const DEV: Record<string, string> = { mobile: "📱 موبايل", tablet: "📲 تابلت", desktop: "💻 كمبيوتر" };
const ROSE = "#c2185b";
const n = (v: number) => v.toLocaleString("ar-EG");

function Bars({ title, items, map }: { title: string; items: Stat[]; map?: Record<string, string> }) {
  const max = items.length ? items[0].count : 0;
  if (!items.length) return null;
  return (
    <div className="card" style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10, color: "#5a1535" }}>{title}</div>
      <div style={{ display: "grid", gap: 9 }}>
        {items.map((it) => (
          <div key={it.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
              <span>{map?.[it.name] || it.name}</span>
              <b>{n(it.count)}</b>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: "#fdecef", overflow: "hidden" }}>
              <div style={{ width: (it.count / max) * 100 + "%", height: "100%", background: ROSE, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VisitsPage() {
  const [range, setRange] = useState<string>("today");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setErr("");
    fetch("/api/admin/visits?range=" + range)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setErr("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 60 }}>
      <h1 className="font-display" style={{ fontWeight: 800, fontSize: 24, color: "#5a1535", marginBottom: 12 }}>الزوار</h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {RANGES.map(([v, l]) => (
          <button key={v} onClick={() => setRange(v)}
            style={{ padding: "8px 16px", borderRadius: 999, fontWeight: 700, fontSize: 13,
              border: "1.5px solid " + (range === v ? ROSE : "#f0cfdd"),
              background: range === v ? ROSE : "#fff", color: range === v ? "#fff" : "#5a2a3d" }}>{l}</button>
        ))}
      </div>

      {err && <p style={{ color: "#e03131", fontWeight: 700 }}>{err}</p>}
      {loading && !data && <p style={{ opacity: 0.6 }}>جاري التحميل...</p>}

      {data && (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 13, opacity: 0.65 }}>عدد الزيارات</div>
            <div className="font-display" style={{ fontSize: 36, fontWeight: 800, color: ROSE }}>{n(data.total)}</div>
            <div style={{ fontSize: 11.5, opacity: 0.6 }}>كل جهاز بيتحسب مرة كل ٢٤ ساعة{data.truncated ? " · معروض آخر ٥٠٠٠ زيارة بس" : ""}</div>
          </div>

          <Bars title="المصدر" items={data.sources} />
          <Bars title="الجهاز" items={data.devices} map={DEV} />
          <Bars title="المكان (تقريبي)" items={data.places} />
          <Bars title="الصفحات" items={data.paths} />

          <div style={{ fontWeight: 800, fontSize: 16, color: "#5a1535", margin: "16px 4px 8px" }}>آخر الزيارات</div>
          {data.entries.length === 0 && <p style={{ opacity: 0.6 }}>مفيش زيارات في الفترة دي.</p>}
          <div className="card" style={{ overflow: "hidden" }}>
            {data.entries.map((e, i) => (
              <div key={e.id} style={{ padding: "11px 14px", borderTop: i ? "1px solid #fbeaf1" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ direction: "ltr" }}>{e.path}</span>
                  <span style={{ opacity: 0.65, fontWeight: 600, flexShrink: 0 }}>
                    {new Date(e.at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>
                  {e.device ? DEV[e.device] || e.device : "—"}
                  {e.browser ? " · " + e.browser : ""}{e.os ? " · " + e.os : ""}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                  {e.source ? "المصدر: " + e.source : "زيارة قديمة (قبل تسجيل التفاصيل)"}
                  {e.city || e.country ? " · " + [e.city, e.country].filter(Boolean).join("، ") : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
