"use client";
import type { BIPEvent } from "@/lib/pwa-types";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const early = window.__zinaBip;
    const href = ((document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href || "");
    if (early && !href.includes("admin-app")) setEvt(early);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__zinaBip = e as BIPEvent;
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  return (
    <div className="card p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-charcoal">📱 ثبّتي تطبيق Zina Nails على موبايلك</span>
        {evt && (
          <button
            onClick={async () => {
              evt.prompt();
              await evt.userChoice.catch(() => {});
              setEvt(null);
            }}
            className="btn-primary !px-4 !py-2 shrink-0"
          >
            تثبيت
          </button>
        )}
      </div>
      {ios && !evt && (
        <p className="mt-2 text-xs text-charcoal/70">من زرار المشاركة في سفاري اختاري «إضافة إلى الشاشة الرئيسية».</p>
      )}
    </div>
  );
}
