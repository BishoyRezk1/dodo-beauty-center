"use client";

import { useEffect, useState } from "react";
import { formatEGP, formatArabicDate } from "@/lib/utils";

interface CustomerBooking {
  bookingNumber: string;
  service: string;
  date: string;
  status: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
  isBlocked: boolean;
  bookingsCount: number;
  lastBooking: string | null;
  totalPaid: number;
  bookings: CustomerBooking[];
}

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
  COMPLETED: "منتهي"
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = customers.filter(
    (c) => c.name.includes(search) || c.phone.includes(search)
  );

  async function saveNote(id: string) {
    const notes = noteDrafts[id] ?? "";
    await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null })
    });
    load();
  }

  async function toggleBlocked(c: Customer) {
    if (!c.isBlocked && !confirm(`هل تريدين حظر ${c.name}؟ لن تستطيع حجز مواعيد جديدة.`)) return;
    await fetch(`/api/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: !c.isBlocked })
    });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">قاعدة العملاء</h1>

      <input
        placeholder="بحث بالاسم أو رقم الهاتف"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field mb-6"
      />

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((c) => (
          <div key={c.id} className={`card p-4 ${c.isBlocked ? "border-red-300 bg-red-50/40" : ""}`}>
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between text-right"
            >
              <div>
                <p className="font-bold text-charcoal">
                  {c.name} {c.isBlocked && <span className="text-xs text-red-500">(محظورة)</span>}
                </p>
                <p dir="ltr" className="text-sm text-charcoal/50">
                  {c.phone}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-wine">{c.bookingsCount}</p>
                  <p className="text-xs text-charcoal/40">حجز</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-wine">{formatEGP(c.totalPaid)}</p>
                  <p className="text-xs text-charcoal/40">إجمالي مدفوع</p>
                </div>
                <span className="text-charcoal/30">{expanded === c.id ? "▲" : "▼"}</span>
              </div>
            </button>

            {expanded === c.id && (
              <div className="mt-4 border-t border-charcoal/10 pt-3">
                <p className="mb-2 text-xs text-charcoal/40">
                  آخر حجز: {c.lastBooking ? formatArabicDate(c.lastBooking) : "—"}
                </p>
                <div className="mb-3 flex flex-col gap-2">
                  {c.bookings.map((b) => (
                    <div key={b.bookingNumber} className="flex justify-between text-sm">
                      <span className="font-mono text-xs text-charcoal/50">{b.bookingNumber}</span>
                      <span className="text-charcoal/70">{b.service}</span>
                      <span className="text-charcoal/50">{formatArabicDate(b.date)}</span>
                      <span className="text-charcoal/50">{statusLabels[b.status]}</span>
                    </div>
                  ))}
                </div>

                <label className="mb-1 block text-xs font-bold text-charcoal/60">ملاحظات (اختياري)</label>
                <textarea
                  value={noteDrafts[c.id] ?? c.notes ?? ""}
                  onChange={(e) => setNoteDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  placeholder="أي ملاحظة خاصة بالعميلة..."
                  className="input-field mb-2 min-h-16 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => saveNote(c.id)} className="btn-primary !py-1.5 text-xs">
                    حفظ الملاحظة
                  </button>
                  <button
                    onClick={() => toggleBlocked(c)}
                    className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold ${
                      c.isBlocked
                        ? "border-emerald-400 text-emerald-600"
                        : "border-red-400 text-red-500"
                    }`}
                  >
                    {c.isBlocked ? "فك الحظر" : "حظر العميلة"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="text-charcoal/50">لا يوجد عملاء</p>}
      </div>
    </div>
  );
}
