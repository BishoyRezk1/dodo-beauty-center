"use client";

import { useEffect, useState } from "react";

const dayNames = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت"
];

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

interface SpecialWorkingHours {
  id: string;
  date: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  reason: string | null;
}

export default function SettingsAdminPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<DayHours[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [specialHours, setSpecialHours] = useState<SpecialWorkingHours[]>([]);

  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedReason, setNewClosedReason] = useState("");

  const [specialDate, setSpecialDate] = useState("");
  const [specialIsOpen, setSpecialIsOpen] = useState(true);
  const [specialStart, setSpecialStart] = useState("10:00");
  const [specialEnd, setSpecialEnd] = useState("22:00");
  const [specialBreakStart, setSpecialBreakStart] = useState("");
  const [specialBreakEnd, setSpecialBreakEnd] = useState("");
  const [specialReason, setSpecialReason] = useState("");

  const [editingSpecialId, setEditingSpecialId] = useState<string | null>(
    null
  );

  const [saved, setSaved] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [specialSaved, setSpecialSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadClosedDates() {
    try {
      const res = await fetch("/api/closed-dates");

      if (!res.ok) return;

      const data = await res.json();

      if (Array.isArray(data)) {
        setClosedDates(data);
      }
    } catch (error) {
      console.error("Load closed dates error:", error);
    }
  }

  async function loadSpecialHours() {
    try {
      const res = await fetch("/api/special-working-hours");

      if (!res.ok) return;

      const data = await res.json();

      if (Array.isArray(data)) {
        setSpecialHours(data);
      }
    } catch (error) {
      console.error("Load special hours error:", error);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, hoursRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/working-hours")
        ]);

        const settingsData = await settingsRes.json();
        const hoursData = await hoursRes.json();

        setSettings(settingsData);

        setHours(
          Array.from({ length: 7 }, (_, i) => {
            const existing = Array.isArray(hoursData)
              ? hoursData.find(
                  (d: DayHours) => d.dayOfWeek === i
                )
              : null;

            return (
              existing || {
                dayOfWeek: i,
                isOpen: true,
                startTime: "10:00",
                endTime: "22:00",
                breakStart: null,
                breakEnd: null
              }
            );
          })
        );
      } catch (error) {
        console.error("Settings load error:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
    loadClosedDates();
    loadSpecialHours();
  }, []);

  async function addClosedDate() {
    if (!newClosedDate) return;

    try {
      const res = await fetch("/api/closed-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: newClosedDate,
          reason: newClosedReason || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "تعذر إضافة الإجازة");
        return;
      }

      setNewClosedDate("");
      setNewClosedReason("");
      await loadClosedDates();
    } catch {
      alert("حدث خطأ أثناء إضافة الإجازة");
    }
  }

  async function removeClosedDate(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا اليوم المغلق؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/closed-dates/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        alert("تعذر حذف اليوم");
        return;
      }

      await loadClosedDates();
    } catch {
      alert("حدث خطأ أثناء الحذف");
    }
  }

  function updateDay(
    index: number,
    patch: Partial<DayHours>
  ) {
    setHours((prev) =>
      prev.map((d, i) =>
        i === index
          ? {
              ...d,
              ...patch
            }
          : d
      )
    );
  }

  async function saveHours() {
    try {
      const res = await fetch("/api/working-hours", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          days: hours
        })
      });

      if (!res.ok) {
        alert("تعذر حفظ ساعات العمل");
        return;
      }

      setHoursSaved(true);

      setTimeout(() => {
        setHoursSaved(false);
      }, 2500);
    } catch {
      alert("حدث خطأ أثناء حفظ ساعات العمل");
    }
  }

  function resetSpecialForm() {
    setEditingSpecialId(null);
    setSpecialDate("");
    setSpecialIsOpen(true);
    setSpecialStart("10:00");
    setSpecialEnd("22:00");
    setSpecialBreakStart("");
    setSpecialBreakEnd("");
    setSpecialReason("");
  }

  function editSpecial(item: SpecialWorkingHours) {
    setEditingSpecialId(item.id);
    setSpecialDate(item.date.slice(0, 10));
    setSpecialIsOpen(item.isOpen);
    setSpecialStart(item.startTime);
    setSpecialEnd(item.endTime);
    setSpecialBreakStart(item.breakStart || "");
    setSpecialBreakEnd(item.breakEnd || "");
    setSpecialReason(item.reason || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function saveSpecialHours() {
    if (!specialDate) {
      alert("اختر التاريخ أولًا");
      return;
    }

    if (specialIsOpen && specialStart >= specialEnd) {
      alert("وقت البداية يجب أن يكون قبل وقت النهاية");
      return;
    }

    if (
      (specialBreakStart && !specialBreakEnd) ||
      (!specialBreakStart && specialBreakEnd)
    ) {
      alert("يجب إدخال بداية ونهاية فترة الراحة معًا");
      return;
    }

    try {
      const res = await fetch("/api/special-working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: specialDate,
          isOpen: specialIsOpen,
          startTime: specialStart,
          endTime: specialEnd,
          breakStart: specialBreakStart || null,
          breakEnd: specialBreakEnd || null,
          reason: specialReason || null
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "تعذر حفظ ساعات العمل الخاصة");
        return;
      }

      setSpecialSaved(true);

      setTimeout(() => {
        setSpecialSaved(false);
      }, 2500);

      resetSpecialForm();
      await loadSpecialHours();
    } catch {
      alert("حدث خطأ أثناء حفظ ساعات العمل الخاصة");
    }
  }

  async function deleteSpecial(id: string) {
    if (
      !confirm(
        "هل تريد حذف هذا الاستثناء؟ سيعود اليوم إلى ساعات العمل الأسبوعية العادية."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/special-working-hours?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE"
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "تعذر حذف الاستثناء");
        return;
      }

      if (editingSpecialId === id) {
        resetSpecialForm();
      }

      await loadSpecialHours();
    } catch {
      alert("حدث خطأ أثناء الحذف");
    }
  }

  function set(key: string, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function save() {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        alert("تعذر حفظ الإعدادات");
        return;
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch {
      alert("حدث خطأ أثناء حفظ الإعدادات");
    }
  }

  if (loading) {
    return (
      <p className="text-charcoal/50">
        جاري التحميل...
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">
        الإعدادات
      </h1>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          بيانات الموقع
        </h2>

        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="اسم الموقع"
            value={settings.site_name || ""}
            onChange={(e) =>
              set("site_name", e.target.value)
            }
          />

          <input
            className="input-field"
            placeholder="الشعار / الوصف المختصر"
            value={settings.site_tagline || ""}
            onChange={(e) =>
              set("site_tagline", e.target.value)
            }
          />

          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Facebook"
            value={settings.facebook_url || ""}
            onChange={(e) =>
              set("facebook_url", e.target.value)
            }
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          💰 Vodafone Cash
        </h2>

        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            dir="ltr"
            placeholder="رقم Vodafone Cash"
            value={settings.vodafone_number || ""}
            onChange={(e) =>
              set("vodafone_number", e.target.value)
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="input-field"
              value={settings.fee_type || "FIXED"}
              onChange={(e) =>
                set("fee_type", e.target.value)
              }
            >
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PERCENT">
                نسبة من سعر الخدمة
              </option>
            </select>

            <input
              className="input-field"
              type="number"
              placeholder="قيمة رسوم الحجز"
              value={settings.fee_value || ""}
              onChange={(e) =>
                set("fee_value", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          📱 واتساب
        </h2>

        <input
          className="input-field"
          dir="ltr"
          placeholder="رقم واتساب المحل"
          value={
            settings.whatsapp_shop_link_number || ""
          }
          onChange={(e) =>
            set(
              "whatsapp_shop_link_number",
              e.target.value
            )
          }
        />

        <p className="mt-2 text-xs text-charcoal/50">
          يتم استخدام روابط واتساب المباشرة الموجودة
          بالنظام.
        </p>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          📍 الموقع على الخريطة
        </h2>

        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            placeholder="العنوان"
            value={settings.map_address || ""}
            onChange={(e) =>
              set("map_address", e.target.value)
            }
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="input-field"
              dir="ltr"
              placeholder="Latitude"
              value={settings.map_lat || ""}
              onChange={(e) =>
                set("map_lat", e.target.value)
              }
            />

            <input
              className="input-field"
              dir="ltr"
              placeholder="Longitude"
              value={settings.map_lng || ""}
              onChange={(e) =>
                set("map_lng", e.target.value)
              }
            />
          </div>

          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Google Maps"
            value={settings.map_url || ""}
            onChange={(e) =>
              set("map_url", e.target.value)
            }
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          🕐 أيام وساعات العمل
        </h2>

        <div className="flex flex-col gap-3">
          {hours.map((d, i) => (
            <div
              key={d.dayOfWeek}
              className="flex flex-wrap items-center gap-2 border-b border-charcoal/5 pb-3"
            >
              <label className="flex w-28 items-center gap-2 text-sm font-bold text-charcoal">
                <input
                  type="checkbox"
                  checked={d.isOpen}
                  onChange={(e) =>
                    updateDay(i, {
                      isOpen: e.target.checked
                    })
                  }
                />

                {dayNames[d.dayOfWeek]}
              </label>

              {d.isOpen && (
                <>
                  <input
                    type="time"
                    value={d.startTime}
                    onChange={(e) =>
                      updateDay(i, {
                        startTime: e.target.value
                      })
                    }
                    className="input-field w-auto !py-1.5 text-sm"
                  />

                  <span className="text-charcoal/40">
                    إلى
                  </span>

                  <input
                    type="time"
                    value={d.endTime}
                    onChange={(e) =>
                      updateDay(i, {
                        endTime: e.target.value
                      })
                    }
                    className="input-field w-auto !py-1.5 text-sm"
                  />
                </>
              )}

              {!d.isOpen && (
                <span className="text-sm font-bold text-red-500">
                  مغلق
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveHours}
          className="btn-primary mt-4 !py-2 text-sm"
        >
          حفظ ساعات العمل
        </button>

        {hoursSaved && (
          <span className="mr-4 text-sm font-bold text-emerald-600">
            ✓ تم الحفظ
          </span>
        )}
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-4">
          <h2 className="font-bold text-charcoal">
            ⭐ ساعات العمل الخاصة
          </h2>

          <p className="mt-1 text-xs text-charcoal/50">
            تستخدم لتغيير ساعات يوم محدد فقط، وتكون لها
            الأولوية على ساعات العمل الأسبوعية.
          </p>
        </div>

        <div className="rounded-xl bg-blush/20 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-charcoal">
              {editingSpecialId
                ? "✏️ تعديل الاستثناء"
                : "➕ إضافة استثناء"}
            </h3>

            {editingSpecialId && (
              <button
                type="button"
                onClick={resetSpecialForm}
                className="text-sm font-bold text-charcoal/60 hover:underline"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-charcoal/60">
                التاريخ
              </label>

              <input
                type="date"
                value={specialDate}
                onChange={(e) =>
                  setSpecialDate(e.target.value)
                }
                className="input-field"
              />
            </div>

            <div className="flex items-end">
              <label className="flex h-11 w-full items-center gap-3 rounded-lg border border-charcoal/10 bg-white px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={specialIsOpen}
                  onChange={(e) =>
                    setSpecialIsOpen(e.target.checked)
                  }
                />

                اليوم مفتوح
              </label>
            </div>
          </div>

          {specialIsOpen && (
            <>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-charcoal/60">
                    بداية العمل
                  </label>

                  <input
                    type="time"
                    value={specialStart}
                    onChange={(e) =>
                      setSpecialStart(e.target.value)
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-charcoal/60">
                    نهاية العمل
                  </label>

                  <input
                    type="time"
                    value={specialEnd}
                    onChange={(e) =>
                      setSpecialEnd(e.target.value)
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-charcoal/60">
                    بداية الراحة
                  </label>

                  <input
                    type="time"
                    value={specialBreakStart}
                    onChange={(e) =>
                      setSpecialBreakStart(
                        e.target.value
                      )
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-charcoal/60">
                    نهاية الراحة
                  </label>

                  <input
                    type="time"
                    value={specialBreakEnd}
                    onChange={(e) =>
                      setSpecialBreakEnd(
                        e.target.value
                      )
                    }
                    className="input-field"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold text-charcoal/60">
              السبب / الملاحظة
            </label>

            <input
              className="input-field"
              placeholder={
                specialIsOpen
                  ? "مثال: العمل من 12 إلى 18 بسبب مناسبة"
                  : "مثال: إجازة خاصة"
              }
              value={specialReason}
              onChange={(e) =>
                setSpecialReason(e.target.value)
              }
              maxLength={500}
            />
          </div>

          <button
            onClick={saveSpecialHours}
            className="btn-primary mt-4 !py-2 text-sm"
          >
            {editingSpecialId
              ? "حفظ التعديل"
              : "إضافة اليوم"}
          </button>

          {specialSaved && (
            <span className="mr-4 text-sm font-bold text-emerald-600">
              ✓ تم الحفظ
            </span>
          )}
        </div>

        <div className="mt-5">
          {specialHours.length === 0 ? (
            <p className="text-sm text-charcoal/40">
              لا توجد ساعات خاصة مسجلة.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {specialHours.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-charcoal/5 bg-white p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-bold text-charcoal">
                        {new Date(
                          item.date
                        ).toLocaleDateString("ar-EG")}
                      </div>

                      {item.isOpen ? (
                        <div className="mt-1 text-sm text-charcoal/70">
                          🟢 مفتوح من{" "}
                          <strong>
                            {item.startTime}
                          </strong>{" "}
                          إلى{" "}
                          <strong>
                            {item.endTime}
                          </strong>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm font-bold text-red-500">
                          🔴 مغلق
                        </div>
                      )}

                      {item.breakStart &&
                        item.breakEnd && (
                          <div className="mt-1 text-xs text-charcoal/50">
                            ☕ راحة:{" "}
                            {item.breakStart} -{" "}
                            {item.breakEnd}
                          </div>
                        )}

                      {item.reason && (
                        <div className="mt-1 text-xs text-charcoal/50">
                          {item.reason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editSpecial(item)
                        }
                        className="rounded-lg bg-blush/30 px-3 py-2 text-xs font-bold text-charcoal"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSpecial(item.id)
                        }
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          🚫 الإجازات والأيام المغلقة
        </h2>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="date"
            value={newClosedDate}
            onChange={(e) =>
              setNewClosedDate(e.target.value)
            }
            className="input-field w-auto !py-2 text-sm"
          />

          <input
            placeholder="السبب (اختياري)"
            value={newClosedReason}
            onChange={(e) =>
              setNewClosedReason(e.target.value)
            }
            className="input-field w-auto flex-1 !py-2 text-sm"
          />

          <button
            onClick={addClosedDate}
            className="btn-primary !py-2 text-sm"
          >
            إضافة
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {closedDates.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg bg-blush/20 px-3 py-2 text-sm"
            >
              <span className="font-bold text-charcoal">
                {new Date(
                  d.date
                ).toLocaleDateString("ar-EG")}{" "}
                {d.reason && `— ${d.reason}`}
              </span>

              <button
                onClick={() =>
                  removeClosedDate(d.id)
                }
                className="text-xs font-bold text-red-500 hover:underline"
              >
                حذف
              </button>
            </div>
          ))}

          {closedDates.length === 0 && (
            <p className="text-sm text-charcoal/40">
              لا توجد إجازات مسجلة
            </p>
          )}
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          📱 روابط السوشيال ميديا
        </h2>

        <div className="flex flex-col gap-3">
          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Instagram"
            value={settings.instagram_url || ""}
            onChange={(e) =>
              set("instagram_url", e.target.value)
            }
          />

          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط Facebook"
            value={settings.facebook_url || ""}
            onChange={(e) =>
              set("facebook_url", e.target.value)
            }
          />

          <input
            className="input-field"
            dir="ltr"
            placeholder="رابط TikTok"
            value={settings.tiktok_url || ""}
            onChange={(e) =>
              set("tiktok_url", e.target.value)
            }
          />
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-bold text-charcoal">
          📅 الحجوزات
        </h2>

        <label className="mb-1 block text-sm text-charcoal/60">
          عدد الحجوزات المسموح بها في نفس الوقت
        </label>

        <input
          className="input-field mb-4"
          type="number"
          min={1}
          value={
            settings.max_concurrent_bookings || "1"
          }
          onChange={(e) =>
            set(
              "max_concurrent_bookings",
              e.target.value
            )
          }
        />

        <label className="mb-1 block text-sm text-charcoal/60">
          أقل مدة مسموح بها للحجز قبل الموعد
          (بالساعات)
        </label>

        <input
          className="input-field mb-4"
          type="number"
          min={0}
          step={0.5}
          value={
            settings.min_advance_hours || "0"
          }
          onChange={(e) =>
            set(
              "min_advance_hours",
              e.target.value
            )
          }
        />

        <label className="mb-1 block text-sm text-charcoal/60">
          أقصى عدد أيام مسموح الحجز بها مقدمًا
        </label>

        <input
          className="input-field"
          type="number"
          min={1}
          value={
            settings.max_advance_days || "60"
          }
          onChange={(e) =>
            set(
              "max_advance_days",
              e.target.value
            )
          }
        />
      </div>

      <button
        onClick={save}
        className="btn-primary"
      >
        حفظ الإعدادات
      </button>

      {saved && (
        <span className="mr-4 text-sm font-bold text-emerald-600">
          ✓ تم الحفظ
        </span>
      )}
    </div>
  );
}
