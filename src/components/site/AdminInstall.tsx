"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AdminInstall() {
  const pathname = usePathname() || "";
  const [evt, setEvt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);
    const onPrompt = (e: Event) => {
      // Only keep the prompt if this page was served with the ADMIN manifest.
      const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href || "";
      if (!href.includes("admin-app.webmanifest")) return;
      e.preventDefault();
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

  if (!pathname.startsWith("/admin") || installed || !evt) return null;

  return (
    <button
      onClick={async () => {
        evt.prompt();
        await evt.userChoice.catch(() => {});
        setEvt(null);
      }}
      className="fixed bottom-4 left-4 z-50 rounded-full bg-charcoal px-4 py-3 text-sm font-bold text-white shadow-soft"
    >
      📱 ثبّت تطبيق الأدمن
    </button>
  );
}
