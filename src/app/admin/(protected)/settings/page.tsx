"use client";

import { useEffect, useState } from "react";

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface DayHours {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}

interface ClosedDate {
  id: string;
  date: string;
  reason: string | null;
}

export default function SettingsAdminPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<DayHours[]>([]);
  const [saved, setSaved] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedReason, setNewClosedReason] = useState("");

  async function loadClosedDates() {
    const res = await fetch("/api/closed-dates");
    setClosedDates(await res.json());
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/working-hours").then((r) => r.json())
    ]).then(([s, h]) => {
      setSettings(s);
      setHours(
        Array.from({ length: 7 }, (_, i) => {
          const existing = h.find((d: DayHours) => d.dayOfWeek === i);
          return existing || { dayOfWeek: i, isOpen: true, startTime: "10:00", endTime: "22:00" };
        })
      );
      setLoading(false);
    });
    loadClosedDates();
  }, []);

  async function addClosedDate() {
    if (!newClosedDate) return;
    await fetch("/api/closed-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newClosedDate, reason: newClosedReason || undefined })
    });
    setNewClosedDate("");
    setNewClosedReason("");
    loadClosedDates();
  }

  async function removeClosedDate(id: string) {
    await fetch(`/api/closed-dates/${id}`, { method: "DELETE" });
    loadClosedDates();
  }

  function updateDay(i: number, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function saveHours() {
    await fetch("/api/working-hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: hours })
    });
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 2500);
  }

  function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <p className="text-charcoal/50">جاري التحميل...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">الإعدادات</h1>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">بيانات الموقع</h2>
        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="اسم الموقع"
            value={settings.site_name || ""}
            onChange={(e) => set("site_name", e.target.value)}
          />
          <input
            className="input-field"
            placeholder="الشعار / الوصف المختصر"
            value={settings.site_tagline || ""}
            onChange={(e) => set("site_tagline", e.target.value)}
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">💰 Vodafone Cash</h2>
        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            dir="ltr"
            placeholder="رقم Vodafone Cash"
            value={settings.vodafone_number || ""}
            onChange={(e) => set("vodafone_number", e.target.value)}
          />
          <div className="flex gap-3">
            <select
              className="input-field"
              value={settings.fee_type || "FIXED"}
              onChange={(e) => set("fee_type", e.target.value)}
            >
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PERCENT">نسبة من سعر الخدمة</option>
            </select>
            <input
              className="input-field"
              type="number"
              placeholder="قيمة رسوم الحجز"
              value={settings.fee_value || ""}
              onChange={(e) => set("fee_value", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">📱 واتساب</h2>
        <input
          className="input-field"
          dir="ltr"
          placeholder="رقم واتساب المحل (بصيغة دولية بدون +، مثال 2010XXXXXXXX)"
          value={settings.whatsapp_shop_link_number || ""}
          onChange={(e) => set("whatsapp_shop_link_number", e.target.value)}
        />
        <p className="mt-2 text-xs text-charcoal/50">
          لتفعيل الإرسال التلقائي عبر WhatsApp Business Cloud API، أضيفي WHATSAPP_PHONE_NUMBER_ID و
          WHATSAPP_ACCESS_TOKEN في Environment Variables على Vercel. بدون ذلك سيعمل النظام تلقائيًا عبر روابط
          واتساب المباشرة.
        </p>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">📍 الموقع على الخريطة</h2>
        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="العنوان"
            value={settings.map_address || ""}
            onChange={(e) => set("map_address", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              dir="ltr"
              placeholder="Latitude"
              value={settings.map_lat || ""}
              onChange={(e) => set("map_lat", e.target.value)}
            />
            <input
              className="input-field"
              dir="ltr"
              placeholder="Longitude"
              value={settings.map_lng || ""}
              onChange={(e) => set("map_lng", e.target.value)}
            />
          </div>
          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Google Maps"
            value={settings.map_url || ""}
            onChange={(e) => set("map_url", e.target.value)}
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">🕐 أيام وساعات العمل</h2>
        <div className="flex flex-col gap-3">
          {hours.map((d, i) => (
            <div key={d.dayOfWeek} className="flex flex-wrap items-center gap-2 border-b border-charcoal/5 pb-2">
              <label className="flex w-24 items-center gap-2 text-sm font-bold text-charcoal">
                <input type="checkbox" checked={d.isOpen} onChange={(e) => updateDay(i, { isOpen: e.target.checked })} />
                {dayNames[d.dayOfWeek]}
              </label>
              {d.isOpen && (
                <>
                  <input
                    type="time"
                    value={d.startTime}
                    onChange={(e) => updateDay(i, { startTime: e.target.value })}
                    className="input-field w-auto !py-1.5 text-sm"
                  />
                  <span className="text-charcoal/40">إلى</span>
                  <input
                    type="time"
                    value={d.endTime}
                    onChange={(e) => updateDay(i, { endTime: e.target.value })}
                    className="input-field w-auto !py-1.5 text-sm"
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveHours} className="btn-primary mt-4 !py-2 text-sm">
          حفظ ساعات العمل
        </button>
        {hoursSaved && <span className="mr-4 text-sm font-bold text-emerald-600">✓ تم الحفظ</span>}
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">🚫 الإجازات والأيام المغلقة</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="date"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
            className="input-field w-auto !py-2 text-sm"
          />
          <input
            placeholder="السبب (اختياري)"
            value={newClosedReason}
            onChange={(e) => setNewClosedReason(e.target.value)}
            className="input-field w-auto flex-1 !py-2 text-sm"
          />
          <button onClick={addClosedDate} className="btn-primary !py-2 text-sm">
            إضافة
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {closedDates.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg bg-blush/20 px-3 py-2 text-sm">
              <span className="font-bold text-charcoal">
                {new Date(d.date).toLocaleDateString("ar-EG")} {d.reason && `— ${d.reason}`}
              </span>
              <button onClick={() => removeClosedDate(d.id)} className="text-xs font-bold text-red-500 hover:underline">
                حذف
              </button>
            </div>
          ))}
          {closedDates.length === 0 && <p className="text-sm text-charcoal/40">لا توجد إجازات مسجلة</p>}
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">📱 روابط السوشيال ميديا</h2>
        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Instagram"
            value={settings.instagram_url || ""}
            onChange={(e) => set("instagram_url", e.target.value)}
          />
          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Facebook"
            value={settings.facebook_url || ""}
            onChange={(e) => set("facebook_url", e.target.value)}
          />
          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط TikTok"
            value={settings.tiktok_url || ""}
            onChange={(e) => set("tiktok_url", e.target.value)}
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">📅 الحجوزات</h2>
        <label className="mb-1 block text-sm text-charcoal/60">عدد الحجوزات المسموح بها في نفس الوقت</label>
        <input
          className="input-field"
          type="number"
          min={1}
          value={settings.max_concurrent_bookings || "1"}
          onChange={(e) => set("max_concurrent_bookings", e.target.value)}
        />
      </div>

      <button onClick={save} className="btn-primary">
        حفظ الإعدادات
      </button>
      {saved && <span className="mr-4 text-sm font-bold text-emerald-600">✓ تم الحفظ</span>}
    </div>
  );
}
