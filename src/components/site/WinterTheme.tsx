"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "zina_winter";
const BTN_TOP = 66; // ارتفاع زر ❄️ من فوق (px)، عدّله لو بيغطي حاجة في الهيدر

type Flake = { x: number; y: number; r: number; vy: number; vx: number; ph: number };

export default function WinterTheme() {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin");
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "off") setOn(false);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("winter", ready && on);
    return () => document.documentElement.classList.remove("winter");
  }, [on, ready]);

  useEffect(() => {
    if (!ready || !on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const base = isAdmin ? 16 : 36;
    const count = w < 640 ? Math.round(base * 0.7) : base;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const flakes: Flake[] = Array.from({ length: count }, () => ({
      x: rnd(0, w),
      y: rnd(0, h),
      r: rnd(1.6, isAdmin ? 3 : 4),
      vy: rnd(0.35, 1.0),
      vx: rnd(-0.15, 0.15),
      ph: rnd(0, Math.PI * 2),
    }));

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return; // ~30fps لتوفير البطارية
      const dt = Math.min((t - last) / 16.7, 3);
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.ph += 0.02 * dt;
        f.y += f.vy * dt;
        f.x += (Math.sin(f.ph) * 0.4 + f.vx) * dt;
        if (f.y > h + 6) {
          f.y = -6;
          f.x = rnd(0, w);
        }
        if (f.x > w + 6) f.x = -6;
        else if (f.x < -6) f.x = w + 6;
        ctx.beginPath();
        ctx.fillStyle = "rgba(160,200,245,0.7)";
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.arc(f.x, f.y, f.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [on, ready, isAdmin]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
  };

  if (!ready) return null;
  return (
    <>
      {on && (
        <canvas
          ref={ref}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
      <button
        onClick={toggle}
        aria-label={on ? "إيقاف أجواء الشتاء" : "تشغيل أجواء الشتاء"}
        title={on ? "إيقاف الثلج" : "تشغيل الثلج"}
        style={{
          position: "fixed",
          left: 10,
          top: `calc(env(safe-area-inset-top, 0px) + ${BTN_TOP}px)`,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "1px solid #cfe0f7",
          background: "rgba(255,255,255,0.88)",
          fontSize: 16,
          lineHeight: 1,
          opacity: on ? 1 : 0.55,
          zIndex: 50,
        }}
      >
        ❄️
      </button>
    </>
  );
}
