"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatEGP, formatArabicDate } from "@/lib/utils";

interface Stats {
  total: number;
  todayCount: number;
  upcoming: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  customersCount: number;
  totalFees: number;
  recentBookings: any[];
  popularServices: { service: string; count: number }[];
}

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
  COMPLETED: "منتهي"
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <p className="text-charcoal/50">جاري التحميل...</p>;

  const cards = [
    { label: "إجمالي الحجوزات", value: stats.total },
    { label: "حجوزات اليوم", value: stats.todayCount },
    { label: "الحجوزات القادمة", value: stats.upcoming },
    { label: "بانتظار المراجعة", value: stats.pending },
    { label: "الحجوزات المؤكدة", value: stats.confirmed },
    { label: "الحجوزات الملغاة", value: stats.cancelled },
    { label: "عدد العملاء", value: stats.customersCount },
    { label: "إجمالي رسوم الحجز", value: formatEGP(stats.totalFees) }
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">نظرة عامة</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-charcoal/50">{c.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-wine">{c.value}</p>
          </div>
        ))}
      </div>

      {stats.popularServices.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="mb-4 font-bold text-charcoal">أكثر الخدمات حجزًا</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.popularServices} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="service" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7A3B47" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card mt-8 p-5">
        <h2 className="mb-4 font-bold text-charcoal">أحدث الحجوزات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-right text-charcoal/50">
                <th className="pb-2">رقم الحجز</th>
                <th className="pb-2">العميلة</th>
                <th className="pb-2">الخدمة</th>
                <th className="pb-2">التاريخ</th>
                <th className="pb-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBookings.map((b) => (
                <tr key={b.id} className="border-b border-charcoal/5">
                  <td className="py-2 font-mono text-xs">{b.bookingNumber}</td>
                  <td className="py-2">{b.customer.name}</td>
                  <td className="py-2">{b.service.name}</td>
                  <td className="py-2">{formatArabicDate(b.date)}</td>
                  <td className="py-2">{statusLabels[b.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
