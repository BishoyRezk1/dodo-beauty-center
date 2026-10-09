"use client";

import { usePathname } from "next/navigation";

export default function SiteGate({
  maintenance,
  message,
  children
}: {
  maintenance: boolean;
  message: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  if (!maintenance || pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <main dir="rtl" className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <img src="/logo-watermark.png" alt="Zina Nails" className="h-28 w-auto object-contain" />
      <h1 className="font-display text-3xl font-extrabold text-wine">Zina Nails</h1>
      <p className="max-w-sm whitespace-pre-line text-base font-semibold leading-8 text-charcoal">{message}</p>
      <p className="text-sm font-bold text-wine">#ZinaNails · #جمالك_تفاصيله_بتفرق</p>
      <button onClick={() => window.location.reload()} className="btn-secondary">
        تحديث الصفحة
      </button>
    </main>
  );
}
