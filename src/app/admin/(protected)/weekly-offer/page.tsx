"use client";

import { useEffect, useState } from "react";

interface Offer {
  id: string;
  title: string;
  newPrice: string;
  oldPrice: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  archivedAt: string | null;
  service: { category: string; status: string; isActive: boolean; sortOrder: number } | null;
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const num = (v: string) => Number(v).toLocaleString("ar-EG");

export default function WeeklyOfferAdminPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const all: Offer[] = await fetch("/api/offers?all=1").then((r) => r.json());
    const weekly = all
      .filter((o) => o.service?.category === "weekly-offer")
      .sort((a, b) => (a.service?.sortOrder ?? 0) - (b.service?.sortOrder ?? 0));
    setOffers(weekly);
    if (weekly[0]) {
      setStart(ymd(new Date(weekly[0].startDate)));
      setEnd(ymd(new Date(weekly[0].endDate)));
    }
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 3500);
  }

  async function patch(body: Record<string, unknown>, ok: string) {
    const res = await fetch("/api/admin/weekly-offer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await res.json().catch(() => ({}));
    flash(res.ok ? ok : j.error || "فشل التنفيذ");
    load();
  }

  async function createCards() {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyOffer: true })
    });
    flash(res.ok ? "تم إنشاء كروت العرض ✓" : "فشل الإنشاء");
    load();
  }

  async function toggle(o: Offer) {
    await fetch(`/api/offers/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !o.isActive })
    });
    load();
  }

  const now = Date.now();
  const live = offers.filter(
    (o) =>
      o.isActive &&
      !o.archivedAt &&
      new Date(o.startDate).getTime() <= now &&
      new Date(o.endDate).getTime() >= now &&
      o.service?.isActive &&
      o.service?.status === "AVAILABLE"
  ).length;

  return (
    <div className="pb-24">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-charcoal">عرض الأسبوع</h1>
      <p className="mb-5 text-sm text-charcoal/60">
        الكروت الظاهرة الآن للعملاء: <b className="text-wine">{live}</b> من {offers.length}
      </p>

      {msg && (
        <div className="fixed inset-x-4 top-4 z-50 rounded-xl bg-charcoal px-4 py-3 text-center text-sm font-bold text-white shadow-soft">
          {msg}
        </div>
      )}

      {loaded && offers.length === 0 && (
        <div className="card mb-6 flex flex-col gap-3 p-5">
          <p className="text-sm text-charcoal/70">مفيش كروت عرض أسبوع لسه.</p>
          <button onClick={createCards} className="btn-primary !py-2 text-sm">
            إنشاء كروت عرض الأسبوع (9)
          </button>
        </div>
      )}

      <div className="card mb-6 flex flex-col gap-3 p-5">
        <h2 className="font-bold text-charcoal">مدة العرض (لكل الكروت)</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-charcoal/60">
            البداية
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input-field mt-1" />
          </label>
          <label className="text-xs text-charcoal/60">
            النهاية (حتى آخر اليوم)
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input-field mt-1" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              setStart(ymd(t));
              setEnd(ymd(addDays(t, 6)));
            }}
            className="btn-secondary !py-2 text-xs"
          >
            7 أيام من اليوم
          </button>
          <button
            type="button"
            onClick={() => patch({ startDate: start, endDate: end, isActive: true }, "تم حفظ المدة وتشغيل العرض ✓")}
            className="btn-primary !py-2 text-xs"
          >
            حفظ وتشغيل العرض
          </button>
          <button
            type="button"
            onClick={() => patch({ startDate: start, endDate: end }, "تم حفظ التواريخ ✓")}
            className="btn-secondary !py-2 text-xs"
          >
            حفظ التواريخ فقط
          </button>
        </div>
        <div className="border-t border-charcoal/10 pt-3">
          <button
            type="button"
            onClick={() => confirm("إيقاف عرض الأسبوع بالكامل؟") && patch({ isActive: false }, "تم إيقاف العرض ✓")}
            className="rounded-full border-2 border-red-400 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
          >
            إيقاف العرض بالكامل
          </button>
        </div>
        <p className="text-xs text-charcoal/50">
          العرض بيختفي تلقائيًا بعد تاريخ النهاية، وأسعار الخدمات الأساسية ما بتتغيرش.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {offers.map((o) => (
          <div key={o.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold text-charcoal">
                {o.title} {!o.isActive && <span className="text-xs text-red-500">(متوقف)</span>}
              </p>
              <p className="text-sm text-charcoal/50">
                {Number(o.oldPrice) > Number(o.newPrice)
                  ? `${num(o.newPrice)} – ${num(o.oldPrice)} جنيه`
                  : `${num(o.newPrice)} جنيه`}
              </p>
            </div>
            <button onClick={() => toggle(o)} className="btn-secondary !px-3 !py-1.5 text-xs">
              {o.isActive ? "إيقاف" : "تفعيل"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
