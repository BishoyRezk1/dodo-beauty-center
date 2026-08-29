"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "#services", label: "الخدمات" },
  { href: "#offers", label: "العروض" },
  { href: "#reviews", label: "آراء العملاء" },
  { href: "#location", label: "موقعنا" }
];

export default function Header({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rosegold/25 bg-cream/90 backdrop-blur-md">
      <div className="section-container flex h-16 items-center justify-between">
        <Link href="/" className="font-display text-xl font-extrabold tracking-wide text-wine">
          {siteName}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-semibold text-charcoal/80 transition hover:text-wine">
              {l.label}
            </a>
          ))}
          <Link href="/booking" className="btn-primary !py-2.5">
            احجزي الآن
          </Link>
        </nav>

        <button
          aria-label="فتح القائمة"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-wine/30 text-wine md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="border-t border-rosegold/20 bg-cream px-5 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-semibold text-charcoal/80">
                {l.label}
              </a>
            ))}
            <Link href="/booking" onClick={() => setOpen(false)} className="btn-primary w-full">
              احجزي الآن
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
