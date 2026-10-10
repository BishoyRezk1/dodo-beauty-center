"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const isAdminManifest = () =>
  ((document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href || "").includes("admin-app.webmanifest");

export default function AdminInstall() {
  const pathname = usePathname() || "";
  const [evt, setEvt] = useState<any>(null);
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    const early = (window as any).__zinaBip;
    if (early && isAdminManifest()) setEvt(early);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__zinaBip = e;
      if (isAdminManifest()) setEvt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!pathname.startsWith("/admin") || installed || hidden) return null;

  return (
    <div dir="rtl" className="fixed bottom-4 left-4 z-50 max-w-[18rem]">
      {help && !evt && (
        <div className="mb-2 rounded-2xl bg-white p-4 text-xs leading-6 text-charcoal shadow-soft ring-1 ring-rosegold/30">
          <div className="mb-1 font-bold text-wine">تثبيت تطبيق الأدمن</div>
          افتحي قائمة المتصفح ⋮ واختاري <b>Install app</b> أو <b>Add to Home screen</b>.
          <div className="mt-2 text-charcoal/70">
            لو مش ظاهرة: اقفلي تطبيق العميلة (لو مثبّت) وافتحي الرابط من كروم مباشرة، وبعدين حدّثي الصفحة.
          </div>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full bg-charcoal pl-1 pr-4 shadow-soft">
        <button
          onClick={async () => {
            if (evt) {
              evt.prompt();
              await evt.userChoice.catch(() => {});
              setEvt(null);
            } else {
              setHelp((v) => !v);
            }
          }}
          className="py-3 text-sm font-bold text-white"
        >
          📱 {evt ? "ثبّت تطبيق الأدمن" : "تثبيت التطبيق"}
        </button>
        <button onClick={() => setHidden(true)} aria-label="إخفاء" className="px-3 py-3 text-white/70">
          ✕
        </button>
      </div>
    </div>
  );
}
