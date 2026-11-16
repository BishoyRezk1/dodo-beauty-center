"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = { newOrders: number; pendingPayments: number; lowStock: number; outOfStock: number };

export default function ShopAdminTabs() {
  const pathname = usePathname() || "";
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/admin/shop/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setS(d))
      .catch(() => {});
  }, [pathname]);

  const tabs = [
    { href: "/admin/shop", label: "الطلبات", badge: s ? s.newOrders + s.pendingPayments : 0 },
    { href: "/admin/shop/products", label: "المنتجات والمخزون", badge: s ? s.lowStock + s.outOfStock : 0 },
    { href: "/admin/shop/categories", label: "التصنيفات", badge: 0 },
    { href: "/admin/shop/settings", label: "إعدادات المتجر", badge: 0 }
  ];

  return (
    <div className="mb-5">
      <h1 className="mb-3 font-display text-2xl font-extrabold text-charcoal">متجر المنتجات</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const active = t.href === "/admin/shop" ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                active ? "border-wine bg-wine text-cream" : "border-rosegold/40 bg-white text-charcoal/70"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-cream text-wine" : "bg-wine text-cream"}`}>{t.badge}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
