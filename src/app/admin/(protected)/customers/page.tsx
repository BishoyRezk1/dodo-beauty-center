"use client";

import { useEffect, useMemo, useState } from "react";
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
  lastTransactionAt: string | null;
  lastService: string | null;
  totalPaid: number;
  bookings: CustomerBooking[];
}

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
  COMPLETED: "منتهي",
};

const statusClasses: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-blue-50 text-blue-700",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/customers", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load customers");
      }

      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return customers;

    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(value) ||
        c.phone.toLowerCase().includes(value)
      );
    });
  }, [customers, search]);

  async function saveNote(id: string) {
    try {
      setSaving(id);

      const notes = noteDrafts[id] ?? "";

      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save note");
      }

      await load();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ الملاحظة");
    } finally {
      setSaving(null);
    }
  }

  async function toggleBlocked(customer: Customer) {
    if (
      !customer.isBlocked &&
      !confirm(
        `هل تريدين حظر ${customer.name}؟\nلن تستطيع حجز مواعيد جديدة.`
      )
    ) {
      return;
    }

    try {
      setSaving(customer.id);

      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isBlocked: !customer.isBlocked,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update customer");
      }

      await load();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحديث حالة العميلة");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">
          قاعدة العملاء
        </h1>

        <p className="mt-1 text-sm text-charcoal/50">
          متابعة بيانات العميلات والحجوزات والمعاملات السابقة
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-charcoal/50">إجمالي العملاء</p>
          <p className="mt-1 text-2xl font-extrabold text-wine">
            {customers.length}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-charcoal/50">عملاء نشطون</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">
            {customers.filter((c) => !c.isBlocked).length}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-charcoal/50">عملاء محظورون</p>
          <p className="mt-1 text-2xl font-extrabold text-red-500">
            {customers.filter((c) => c.isBlocked).length}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-charcoal/50">إجمالي المدفوع</p>
          <p className="mt-1 text-lg font-extrabold text-wine">
            {formatEGP(
              customers.reduce((sum, customer) => sum + customer.totalPaid, 0)
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          placeholder="🔎 بحث بالاسم أو رقم الهاتف"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />

        {search.trim() && (
          <p className="mt-2 text-xs text-charcoal/40">
            عدد النتائج: {filtered.length}
          </p>
        )}
      </div>

      {loading && (
        <div className="card p-6 text-center text-charcoal/50">
          جاري تحميل قاعدة العملاء...
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          {filtered.map((customer) => (
            <div
              key={customer.id}
              className={`card overflow-hidden ${
                customer.isBlocked
                  ? "border-red-300 bg-red-50/40"
                  : ""
              }`}
            >
              {/* Customer header */}
              <button
                type="button"
                onClick={() =>
                  setExpanded(
                    expanded === customer.id ? null : customer.id
                  )
                }
                className="flex w-full items-center justify-between gap-4 p-4 text-right"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-charcoal">
                      {customer.name}
                    </p>

                    {customer.isBlocked && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        محظورة
                      </span>
                    )}
                  </div>

                  <p
                    dir="ltr"
                    className="mt-1 text-right text-sm text-charcoal/50"
                  >
                    {customer.phone}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="hidden text-center sm:block">
                    <p className="font-bold text-wine">
                      {customer.bookingsCount}
                    </p>
                    <p className="text-[10px] text-charcoal/40">
                      الزيارات
                    </p>
                  </div>

                  <div className="hidden text-center sm:block">
                    <p className="font-bold text-wine">
                      {formatEGP(customer.totalPaid)}
                    </p>
                    <p className="text-[10px] text-charcoal/40">
                      المدفوع
                    </p>
                  </div>

                  <span className="text-charcoal/30">
                    {expanded === customer.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Mobile stats */}
              <div className="grid grid-cols-2 gap-2 border-t border-charcoal/5 px-4 pb-4 sm:hidden">
                <div className="rounded-xl bg-charcoal/5 p-3 text-center">
                  <p className="font-bold text-wine">
                    {customer.bookingsCount}
                  </p>
                  <p className="text-[10px] text-charcoal/40">
                    الزيارات
                  </p>
                </div>

                <div className="rounded-xl bg-charcoal/5 p-3 text-center">
                  <p className="font-bold text-wine">
                    {formatEGP(customer.totalPaid)}
                  </p>
                  <p className="text-[10px] text-charcoal/40">
                    المدفوع
                  </p>
                </div>
              </div>

              {/* Details */}
              {expanded === customer.id && (
                <div className="border-t border-charcoal/10 p-4">
                  {/* Last transaction */}
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-charcoal/5 p-3">
                      <p className="text-[10px] font-bold text-charcoal/40">
                        آخر معاملة
                      </p>
                      <p className="mt-1 text-sm font-bold text-charcoal">
                        {customer.lastTransactionAt
                          ? formatArabicDate(customer.lastTransactionAt)
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-charcoal/5 p-3">
                      <p className="text-[10px] font-bold text-charcoal/40">
                        آخر خدمة
                      </p>
                      <p className="mt-1 text-sm font-bold text-charcoal">
                        {customer.lastService || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-charcoal/5 p-3">
                      <p className="text-[10px] font-bold text-charcoal/40">
                        آخر حجز
                      </p>
                      <p className="mt-1 text-sm font-bold text-charcoal">
                        {customer.lastBooking
                          ? formatArabicDate(customer.lastBooking)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Booking history */}
                  <div className="mb-5">
                    <p className="mb-2 text-sm font-extrabold text-charcoal">
                      سجل الحجوزات
                    </p>

                    {customer.bookings.length === 0 ? (
                      <p className="rounded-xl bg-charcoal/5 p-4 text-center text-xs text-charcoal/40">
                        لا توجد حجوزات
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {customer.bookings.map((booking) => (
                          <div
                            key={booking.bookingNumber}
                            className="grid gap-2 rounded-xl border border-charcoal/10 p-3 sm:grid-cols-[1fr_1.5fr_1fr_auto]"
                          >
                            <span className="font-mono text-xs text-charcoal/50">
                              {booking.bookingNumber}
                            </span>

                            <span className="text-sm font-bold text-charcoal/70">
                              {booking.service}
                            </span>

                            <span className="text-xs text-charcoal/50">
                              {formatArabicDate(booking.date)}
                            </span>

                            <span
                              className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                statusClasses[booking.status] ||
                                "bg-charcoal/5 text-charcoal/50"
                              }`}
                            >
                              {statusLabels[booking.status] ||
                                booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <label className="mb-1 block text-xs font-bold text-charcoal/60">
                    ملاحظات العميلة
                  </label>

                  <textarea
                    value={
                      noteDrafts[customer.id] ??
                      customer.notes ??
                      ""
                    }
                    onChange={(e) =>
                      setNoteDrafts((drafts) => ({
                        ...drafts,
                        [customer.id]: e.target.value,
                      }))
                    }
                    placeholder="أي ملاحظة خاصة بالعميلة..."
                    className="input-field mb-3 min-h-20 text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => saveNote(customer.id)}
                      disabled={saving === customer.id}
                      className="btn-primary !py-2 text-xs disabled:opacity-50"
                    >
                      {saving === customer.id
                        ? "جاري الحفظ..."
                        : "حفظ الملاحظة"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleBlocked(customer)}
                      disabled={saving === customer.id}
                      className={`rounded-full border-2 px-4 py-2 text-xs font-bold disabled:opacity-50 ${
                        customer.isBlocked
                          ? "border-emerald-400 text-emerald-600"
                          : "border-red-400 text-red-500"
                      }`}
                    >
                      {customer.isBlocked
                        ? "فك الحظر"
                        : "حظر العميلة"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card p-8 text-center text-sm text-charcoal/50">
              {search.trim()
                ? "لا توجد نتائج مطابقة للبحث"
                : "لا يوجد عملاء حتى الآن"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
