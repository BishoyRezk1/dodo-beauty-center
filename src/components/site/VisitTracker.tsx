"use client";

import { useEffect, useRef } from "react";

export default function VisitTracker() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname })
    }).catch(() => {});
  }, []);

  return null;
}
