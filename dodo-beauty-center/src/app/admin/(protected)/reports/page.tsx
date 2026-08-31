"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { formatEGP } from "@/lib/utils";

interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  cancelledCount: number;
  dailyBookings: { date: string; count: number }[];
  popularServices: { service: string; count: number }[];
  topCustomers: { name: string; count: number }[];
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}
function defaultTo() {
  return new Date().toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportFile(format: "csv" | "xlsx" | "pdf") {
    window.open(`/api/reports/export?format=${format}&from=${from}&to=${to}`, "_blank");
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-charcoal">التقارير</h1>

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs text-charcoal/50">من تاريخ</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field !py-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-charcoal/50">إلى تاريخ</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field !py-2" />
        </div>
        <button onClick={load} className="btn-primary !py-2.5 text-sm">
          تحديث
        </button>
      </div>

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-charcoal/50">إجمالي الحجوزات</p>
              <p className="mt-1 font-display text-xl font-extrabold text-wine">{data.totalBookings}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-charcoal/50">الإيرادات (مؤكدة)</p>
              <p className="mt-1 font-display text-xl font-extrabold text-wine">{formatEGP(data.totalRevenue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-charcoal/50">الحجوزات الملغاة</p>
              <p className="mt-1 font-display text-xl font-extrabold text-wine">{data.cancelledCount}</p>
            </div>
          </div>

          <div className="card mb-6 p-5">
            <h2 className="mb-4 font-bold text-charcoal">الحجوزات اليومية</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A2C351A" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#E91E63" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card mb-6 p-5">
            <h2 className="mb-4 font-bold text-charcoal">أكثر الخدمات حجزًا</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.popularServices} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#E91E63" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card mb-6 p-5">
            <h2 className="mb-4 font-bold text-charcoal">أكثر العملاء حجزًا</h2>
            <div className="flex flex-col gap-2">
              {data.topCustomers.map((c, i) => (
                <div key={i} className="flex justify-between border-b border-charcoal/5 py-1.5 text-sm">
                  <span className="text-charcoal">{c.name}</span>
                  <span className="font-bold text-wine">{c.count} حجز</span>
                </div>
              ))}
              {data.topCustomers.length === 0 && <p className="text-sm text-charcoal/40">لا توجد بيانات</p>}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold text-charcoal">تصدير البيانات</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => exportFile("csv")} className="btn-secondary !py-2 text-sm">
                CSV تصدير
              </button>
              <button onClick={() => exportFile("xlsx")} className="btn-secondary !py-2 text-sm">
                Excel تصدير
              </button>
              <button onClick={() => exportFile("pdf")} className="btn-secondary !py-2 text-sm">
                PDF تصدير
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
