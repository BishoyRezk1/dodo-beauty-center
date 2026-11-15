"use client";

import Link from "next/link";
import { useCart } from "@/lib/shop/cart";

export default function ShopHeader({ title = "DoDo Beauty Shop", backHref = "/" }: { title?: string; backHref?: string }) {
  const items = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    <header dir="rtl" className="sticky top-0 z-40 border-b border-rosegold/25 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={backHref} aria-label="رجوع" className="flex h-10 w-10 items-center justify-center text-wine">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href="/shop" className="text-lg font-bold text-wine" style={{ fontFamily: "var(--font-display)" }}>
          {title} 💗
        </Link>
        <Link href="/cart" aria-label="عربة التسوق" className="relative flex h-10 w-10 items-center justify-center text-wine">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6h15l-1.5 9h-12z" />
            <path d="M6 6L5 3H2" />
            <circle cx="9" cy="20" r="1.2" />
            <circle cx="18" cy="20" r="1.2" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wine px-1 text-xs font-bold text-cream">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
