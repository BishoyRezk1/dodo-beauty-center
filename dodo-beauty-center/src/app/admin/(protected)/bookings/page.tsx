"use client";

import { useEffect, useState } from "react";
import { formatEGP, formatArabicDate } from "@/lib/utils";

interface Booking {
  id: string;
  bookingNumber: string;
  date: string;
  startTime: string;
  status: string;
  feeAmount: string;
  customer: { name: string; phone: string };
  service: { name: string };
  payment: { screenshotUrl: string; verified: boolean } | null;
}

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
  COMPLETED: "منتهي"
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-charcoal/10 text-charcoal/60",
  COMPLETED: "bg-blue-100 text-blue-700"
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  async function load() {
    setLoading(true);
    const url = filter ? `/api/bookings?status=${filter}` : "/api/bookings";
    const res = await fetch(url);
    setBookings(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.whatsappLink) setWhatsappLink(data.whatsappLink);
    load();
  }

  async function submitReschedule(id: string) {
    if (!newDate || !newTime) return;
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, startTime: newTime })
    });
    const data = await res.json();
    if (data.whatsappLink) setWhatsappLink(data.whatsappLink);
    setReschedulingId(null);
    setNewDate("");
    setNewTime("");
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">إدارة الحجوزات</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field w-auto">
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {whatsappLink && (
        <div className="card mb-4 flex items-center justify-between p-4">
          <p className="text-sm text-charcoal/70">لم يتم إرسال الرسالة تلقائيًا (WhatsApp API غير مفعّل). أرسليها يدويًا:</p>
          <div className="flex gap-2">
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-primary !py-2 text-xs">
              فتح واتساب
            </a>
            <button onClick={() => setWhatsappLink(null)} className="text-xs text-charcoal/40">
              إغلاق
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}

      <div className="flex flex-col gap-4">
        {bookings.map((b) => (
          <div key={b.id} className="card flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-charcoal/50">{b.bookingNumber}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColors[b.status]}`}>
                  {statusLabels[b.status]}
                </span>
              </div>
              <p className="mt-1 font-bold text-charcoal">
                {b.customer.name} · {b.service.name}
              </p>
              <p dir="ltr" className="text-sm text-charcoal/50">
                {b.customer.phone}
              </p>
              <p className="text-sm text-charcoal/50">
                {formatArabicDate(b.date)} — {b.startTime} · رسوم: {formatEGP(b.feeAmount)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {b.payment && (
                <button
                  onClick={() => setPreviewUrl(b.payment!.screenshotUrl)}
                  className="btn-secondary !py-2 text-xs"
                >
                  عرض إثبات التحويل
                </button>
              )}
              {b.status === "PENDING" && (
                <>
                  <button onClick={() => updateStatus(b.id, "CONFIRMED")} className="btn-primary !py-2 text-xs">
                    تأكيد
                  </button>
                  <button
                    onClick={() => updateStatus(b.id, "REJECTED")}
                    className="rounded-full border-2 border-red-400 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                  >
                    رفض
                  </button>
                </>
              )}
              {b.status === "CONFIRMED" && (
                <>
                  <button
                    onClick={() => updateStatus(b.id, "COMPLETED")}
                    className="rounded-full border-2 border-blue-400 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                  >
                    تم الانتهاء
                  </button>
                  <button
                    onClick={() => {
                      setReschedulingId(reschedulingId === b.id ? null : b.id);
                      setNewDate(b.date.split("T")[0]);
                      setNewTime(b.startTime);
                    }}
                    className="rounded-full border-2 border-charcoal/20 px-4 py-2 text-xs font-bold text-charcoal/60 hover:bg-charcoal/5"
                  >
                    تعديل الموعد
                  </button>
                </>
              )}
              {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                <button
                  onClick={() => updateStatus(b.id, "CANCELLED")}
                  className="rounded-full border-2 border-charcoal/20 px-4 py-2 text-xs font-bold text-charcoal/50 hover:bg-charcoal/5"
                >
                  إلغاء
                </button>
              )}
              <a
                href={`https://wa.me/${b.customer.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border-2 border-[#25D366] px-4 py-2 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/10"
              >
                واتساب
              </a>
            </div>
          </div>
          {reschedulingId === b.id && (
            <div className="flex flex-wrap items-center gap-2 border-t border-charcoal/10 pt-3">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input-field w-auto !py-2 text-sm" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="input-field w-auto !py-2 text-sm" />
              <button onClick={() => submitReschedule(b.id)} className="btn-primary !py-2 text-xs">
                حفظ الموعد الجديد
              </button>
              <button onClick={() => setReschedulingId(null)} className="text-xs text-charcoal/40">
                إلغاء
              </button>
            </div>
          )}
          </div>
        ))}
        {!loading && bookings.length === 0 && <p className="text-charcoal/50">لا توجد حجوزات</p>}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} alt="إثبات التحويل" className="max-h-[80vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
