"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  key: string;
  label: string;
  href: string;
  paths: string[];
  external?: boolean;
  primary?: boolean;
};

const ICONS: Record<string, string[]> = {
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  home: ["M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
  services: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"],
  book: ["M12 5v14", "M5 12h14"],
  offers: ["M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z", "M7.5 7.5h.01"],
  chat: ["M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20l1.3-5.3A8.4 8.4 0 1 1 21 11.5z"]
};

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export default function BottomNav({ whatsappHref }: { whatsappHref: string }) {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/admin") || pathname.startsWith("/booking") || pathname.startsWith("/chat")) return null;

  const items: Item[] = [
    { key: "home", label: "الرئيسية", href: "/", paths: ["/"] },
    { key: "services", label: "الخدمات", href: "/#services", paths: [] },
    { key: "book", label: "احجزي الآن", href: "/booking", paths: ["/booking"], primary: true },
    { key: "chat", label: "Zina Chat", href: "/chat", paths: ["/chat"] },
    { key: "user", label: "حسابي", href: "/account", paths: ["/account"] }
  ];

  const isActive = (it: Item) =>
    it.paths.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));

  return (
    <>
      <div
        aria-hidden="true"
        className="md:hidden"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      />
      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-rosegold/25 bg-cream/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-end">
          {items.map((it) => {
            const active = isActive(it);
            const content = it.primary ? (
              <>
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-wine text-cream shadow-soft ring-4 ring-cream">
                  <Icon name={it.key} size={26} />
                </span>
                <span className="pb-1 text-xs font-bold text-wine">{it.label}</span>
              </>
            ) : (
              <>
                <span className={active ? "text-wine" : "text-charcoal/60"}>
                  <Icon name={it.key} />
                </span>
                <span className={`pb-2 text-xs font-semibold ${active ? "text-wine" : "text-charcoal/60"}`}>
                  {it.label}
                </span>
              </>
            );
            const cls = "flex h-full min-h-[44px] flex-col items-center justify-end gap-0.5";
            return (
              <li key={it.key}>
                {it.external ? (
                  <a href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {content}
                  </a>
                ) : (
                  <Link href={it.href} className={cls}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
