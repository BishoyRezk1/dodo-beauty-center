"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  bookingId: string | null;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  BOOKING: "🔔",
  CONFIRMED: "✅",
  REJECTED: "⛔",
  CANCELLED: "🚫"
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.items);
    setUnreadCount(data.unreadCount);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    load();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-charcoal">
          الإشعارات {unreadCount > 0 && <span className="text-sm font-bold text-wine">({unreadCount} جديد)</span>}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary !py-2 text-xs">
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {loading && <p className="text-charcoal/50">جاري التحميل...</p>}

      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markOneRead(n.id)}
            className={`card flex items-start gap-3 p-4 text-right transition ${!n.isRead ? "border-wine/40 bg-blush/20" : ""}`}
          >
            <span className="text-lg">{typeIcon[n.type] || "🔔"}</span>
            <div className="flex-1">
              <p className="font-bold text-charcoal">{n.title}</p>
              <p className="text-sm text-charcoal/60">{n.body}</p>
              <p className="mt-1 text-xs text-charcoal/40">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-wine" />}
          </button>
        ))}
        {!loading && items.length === 0 && <p className="text-charcoal/50">لا توجد إشعارات</p>}
      </div>

      <Link href="/admin/bookings" className="mt-6 inline-block text-sm font-bold text-wine hover:underline">
        عرض كل الحجوزات ←
      </Link>
    </div>
  );
}
