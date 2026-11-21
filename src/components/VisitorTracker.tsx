"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VisitorTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem("zn_tracked")) return;
      let id = localStorage.getItem("zn_vid");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("zn_vid", id);
      }
      sessionStorage.setItem("zn_tracked", "1");
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: id, path: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [pathname]);
  return null;
}
