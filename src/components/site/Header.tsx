"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { href: "/#services", label: "الخدمات" },
  { href: "/offers", label: "العروض" },
  { href: "/#gallery", label: "أعمالنا" },
  { href: "/#reviews", label: "آراء العملاء" },
  { href: "/#location", label: "موقعنا" }
];

export default function Header({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300 " +
        (scrolled ? "border-rosegold/30 bg-cream/95 shadow-soft" : "border-transparent bg-cream/80")
      }
    >
      <div className="section-container flex h-16 items-center justify-between gap-3 md:h-[72px]">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-wide text-wine md:text-2xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-wine to-rosegold text-base text-white shadow-soft">✦</span>
          {siteName}
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="group relative py-1 text-[15px] font-bold text-charcoal/80 transition hover:text-wine">
              {l.label}
              <span className="absolute -bottom-0.5 right-0 h-0.5 w-0 rounded-full bg-wine transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <Link href="/booking" className="btn-primary !py-2.5 shadow-lg">
            احجزي الآن
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/booking" className="btn-primary !px-4 !py-2 text-xs">
            احجزي
          </Link>
          <button
            aria-label="فتح القائمة"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-wine/30 bg-white/70 text-wine"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-rosegold/20 bg-cream/98 px-5 pb-5 pt-3 md:hidden">
          <nav className="grid grid-cols-2 gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-rosegold/20 bg-white/70 px-4 py-3 text-center text-sm font-bold text-charcoal/85 shadow-sm"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
