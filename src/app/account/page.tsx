"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  bookingNumber: string;
  date: string;
  startTime: string;
  status: string;
  service: { name: string };
};
type Me = { customer: { name: string; phone: string; email: string | null }; bookings: Booking[] };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "مؤكد", cls: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
  CANCELLED: { label: "ملغي", cls: "bg-gray-200 text-gray-700" },
  COMPLETED: { label: "مكتمل", cls: "bg-blue-100 text-blue-800" }
};

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-EG", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

function BookingCard({ b }: { b: Booking }) {
  const st = STATUS[b.status] || { label: b.status, cls: "bg-gray-100 text-gray-700" };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-charcoal">{b.service.name}</div>
          <div className="mt-1 text-sm text-charcoal/70">
            {fmtDate(b.date)} · {fmtTime(b.startTime)}
          </div>
          <div className="mt-1 text-xs text-charcoal/50">رقم الحجز: {b.bookingNumber}</div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [needsBn, setNeedsBn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/account/me", { cache: "no-store" });
    setMe(res.ok ? await res.json() : null);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/account/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { phone, password }
            : { name, phone, password, bookingNumber: bookingNumber || undefined }
        )
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NEEDS_BOOKING_NUMBER") setNeedsBn(true);
        setError(data.error || "حصل خطأ، حاولي تاني.");
        return;
      }
      setPassword("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    setMe(null);
  }

  if (me === undefined) {
    return <div className="section-container py-20 text-center text-charcoal/60">جاري التحميل...</div>;
  }

  if (me === null) {
    return (
      <main className="section-container max-w-md py-10">
        <h1 className="font-display text-3xl font-extrabold text-wine">
          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h1>
        <p className="mt-2 text-sm text-charcoal/70">تابعي حجوزاتك في Zina Nails من مكان واحد 💅🏻</p>
        <form onSubmit={submit} className="card mt-6 space-y-4 p-5">
          {mode === "register" && (
            <input className="input-field" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input
            className="input-field"
            placeholder="رقم الموبايل"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="الباسورد"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {mode === "register" && needsBn && (
            <input
              className="input-field"
              placeholder="رقم حجز سابق (للتأكيد)"
              dir="ltr"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value)}
            />
          )}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
          <button
            type="button"
            className="w-full text-center text-sm font-semibold text-wine"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "ماعندكيش حساب؟ سجّلي دلوقتي" : "عندك حساب؟ سجّلي دخول"}
          </button>
        </form>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = me.bookings
    .filter((b) => ["PENDING", "CONFIRMED"].includes(b.status) && b.date.slice(0, 10) >= today)
    .reverse();
  const past = me.bookings.filter((b) => !upcoming.includes(b));

  return (
    <main className="section-container max-w-xl py-8">
      <div className="card flex items-center justify-between p-5">
        <div>
          <div className="font-display text-xl font-extrabold text-charcoal">أهلًا {me.customer.name} 💗</div>
          <div className="mt-1 text-sm text-charcoal/60" dir="ltr">
            {me.customer.phone}
          </div>
        </div>
        <button onClick={logout} className="text-sm font-bold text-wine">
          خروج
        </button>
      </div>

      <Link href="/booking" className="btn-primary mt-4 w-full">
        احجزي موعد جديد
      </Link>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold text-charcoal">مواعيدك القادمة</h2>
      <div className="space-y-3">
        {upcoming.length ? (
          upcoming.map((b) => <BookingCard key={b.id} b={b} />)
        ) : (
          <p className="text-sm text-charcoal/60">مفيش مواعيد قادمة.</p>
        )}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold text-charcoal">سجل الحجوزات</h2>
      <div className="space-y-3">
        {past.length ? (
          past.map((b) => <BookingCard key={b.id} b={b} />)
        ) : (
          <p className="text-sm text-charcoal/60">لسه مفيش حجوزات سابقة.</p>
        )}
      </div>
    </main>
  );
}
