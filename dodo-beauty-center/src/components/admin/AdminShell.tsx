"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/admin/dashboard", label: "الرئيسية", icon: "📊" },
  { href: "/admin/bookings", label: "الحجوزات", icon: "📅" },
  { href: "/admin/notifications", label: "الإشعارات", icon: "🔔" },
  { href: "/admin/customers", label: "العملاء", icon: "👥" },
  { href: "/admin/services", label: "الخدمات", icon: "💇" },
  { href: "/admin/offers", label: "العروض", icon: "🎁" },
  { href: "/admin/coupons", label: "كوبونات الخصم", icon: "🏷️" },
  { href: "/admin/gallery", label: "معرض الأعمال", icon: "🖼️" },
  { href: "/admin/reviews", label: "التقييمات", icon: "⭐" },
  { href: "/admin/reports", label: "التقارير", icon: "📈" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-rosegold/20 bg-white px-4 md:hidden">
        <span className="font-display font-extrabold text-wine">DoDo Admin</span>
        <button onClick={() => setOpen((v) => !v)} className="h-9 w-9 rounded-full border border-wine/30 text-wine">
          {open ? "✕" : "☰"}
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 right-0 z-30 w-64 border-l border-rosegold/20 bg-white p-6 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-8 hidden font-display text-xl font-extrabold text-wine md:block">DoDo Admin</div>
        <nav className="mt-14 flex flex-col gap-1 md:mt-0">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  active ? "bg-wine text-cream" : "text-charcoal/70 hover:bg-blush/40"
                }`}
              >
                <span>{item.icon}</span> {item.label}
                {item.href === "/admin/notifications" && unreadCount > 0 && (
                  <span className="mr-auto rounded-full bg-wine px-2 py-0.5 text-[10px] font-bold text-cream">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="mt-8 w-full rounded-xl border border-wine/30 px-4 py-3 text-sm font-bold text-wine hover:bg-blush/30"
        >
          تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 p-5 pt-20 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
