"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const early = (window as any).__zinaBip;
    const href = ((document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href || "");
    if (early && !href.includes("admin-app")) setEvt(early);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__zinaBip = e;
      setEvt(e);
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
