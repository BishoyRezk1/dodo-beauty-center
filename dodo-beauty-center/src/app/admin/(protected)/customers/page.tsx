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

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter(
    (c) => c.name.includes(search) || c.phone.includes(search)
  );

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
          <div key={c.id} className="card p-4">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between text-right"
            >
              <div>
                <p className="font-bold text-charcoal">{c.name}</p>
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
                <div className="flex flex-col gap-2">
                  {c.bookings.map((b) => (
                    <div key={b.bookingNumber} className="flex justify-between text-sm">
                      <span className="font-mono text-xs text-charcoal/50">{b.bookingNumber}</span>
                      <span className="text-charcoal/70">{b.service}</span>
                      <span className="text-charcoal/50">{formatArabicDate(b.date)}</span>
                      <span className="text-charcoal/50">{statusLabels[b.status]}</span>
                    </div>
                  ))}
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
