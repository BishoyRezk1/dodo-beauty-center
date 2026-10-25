"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ============ إعدادات الثلج (عدّل من هنا فقط) ============ */
const SNOW_ENABLED = true; // false = يلغي التأثير والزر بالكامل
const SNOW_INTENSITY = 1; // 0.5 أخف · 1 افتراضي · 1.5 أكثف
const SNOW_SPEED = 1; // 0.5 أبطأ · 1 افتراضي · 1.5 أسرع
/* ======================================================== */

const STORAGE_KEY = "zina_winter";
const MOBILE_BASE = 28; // المطلوب 20–35
const DESKTOP_BASE = 48; // المطلوب 35–60
const ADMIN_FACTOR = 0.5; // الأدمن أخف
const CALM_ALPHA = 0.25; // شفافية الثلج فوق عناصر data-snow-calm
const MIN_FLAKES = 10;
const BTN_BOTTOM = 100; // ارتفاع الزر من تحت (px)

type Flake = {
  x: number; y: number; d: number; vy: number; vx: number;
  sway: number; ph: number; phs: number; a: number; wait: number;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function makeSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.42, "rgba(255,255,255,1)");
    grad.addColorStop(0.62, "rgba(176,205,245,0.9)");
    grad.addColorStop(0.85, "rgba(176,205,245,0.35)");
    grad.addColorStop(1, "rgba(176,205,245,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  }
  return c;
}

function newFlake(w: number, h: number, scatter: boolean): Flake {
  const p = Math.random();
  // صغيرة جدًا 60% · متوسطة 32% · كبيرة 8%
  const kind = p < 0.6 ? 0 : p < 0.92 ? 1 : 2;
  const r = kind === 0 ? rnd(0.8, 1.3) : kind === 1 ? rnd(1.4, 2.2) : rnd(2.6, 3.6);
  const cycle = (kind === 0 ? rnd(11, 16) : kind === 1 ? rnd(8.5, 13) : rnd(7, 10)) / SNOW_SPEED;
  return {
    x: rnd(0, w),
    y: scatter ? rnd(-h * 0.1, h) : -12,
    d: r * 4.6,
    vy: (h + 24) / cycle,
    vx: rnd(-6, 12), // ميل جانبي خفيف
    sway: rnd(5, 13),
    ph: rnd(0, Math.PI * 2),
    phs: rnd(0.6, 1.4),
    a: kind === 0 ? rnd(0.6, 0.9) : kind === 1 ? rnd(0.75, 1) : rnd(0.85, 1),
    wait: scatter ? 0 : rnd(0, 5),
  };
}

export default function WinterTheme() {
  const pathname = usePathname() || "";
  const isAdmin = pathname.startsWith("/admin");
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "off") setOn(false);
    } catch {}
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!SNOW_ENABLED) return;
    document.documentElement.classList.toggle("winter", ready && on);
    return () => document.documentElement.classList.remove("winter");
  }, [on, ready]);

  useEffect(() => {
    if (!SNOW_ENABLED || !ready || !on) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sprite = makeSprite();
    let w = window.innerWidth;
    let h = window.innerHeight;
    let raf = 0;
    let last = 0;
    let slow = 0;
    let dirty = true;
    let rects: DOMRect[] = [];

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };
    size();

    const base = w < 768 ? MOBILE_BASE : DESKTOP_BASE;
    const count = Math.max(
      MIN_FLAKES,
      Math.round(base * SNOW_INTENSITY * (isAdmin ? ADMIN_FACTOR : 1))
    );
    const flakes: Flake[] = Array.from({ length: count }, () => newFlake(w, h, true));

    const refreshRects = () => {
      rects = Array.from(document.querySelectorAll("[data-snow-calm]")).map((e) =>
        e.getBoundingClientRect()
      );
      dirty = false;
    };
    const inCalm = (x: number, y: number) => {
      for (const r of rects) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
      }
      return false;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const ms = t - last;
      if (ms < 22) return; // ~45fps كحد أقصى لتوفير البطارية
      last = t;
      const dt = Math.min(ms, 100) / 1000;

      // لو الجهاز بطيء، قلّل العدد تلقائيًا
      if (ms > 50) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 45 && flakes.length > MIN_FLAKES) {
        flakes.length = Math.max(MIN_FLAKES, Math.floor(flakes.length * 0.7));
        slow = 0;
      }

      if (dirty) refreshRects();
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        if (f.wait > 0) {
          f.wait -= dt;
          continue;
        }
        f.ph += f.phs * dt;
        f.y += f.vy * dt;
        f.x += (f.vx + Math.sin(f.ph) * f.sway) * dt;
        if (f.y > h + 12) {
          Object.assign(f, newFlake(w, h, false));
          continue;
        }
        if (f.x > w + 12) f.x = -12;
        else if (f.x < -12) f.x = w + 12;
        ctx.globalAlpha = f.a * (rects.length && inCalm(f.x, f.y) ? CALM_ALPHA : 1);
        ctx.drawImage(sprite, f.x - f.d / 2, f.y - f.d / 2, f.d, f.d);
      }
      ctx.globalAlpha = 1;
    };

    const start = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    const markDirty = () => {
      dirty = true;
    };
    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (rt) clearTimeout(rt);
      rt = setTimeout(size, 150);
    };

    start();
    const poll = setInterval(markDirty, 1500);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", markDirty, { passive: true });
    return () => {
      stop();
      clearInterval(poll);
      if (rt) clearTimeout(rt);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", markDirty);
    };
  }, [on, ready, isAdmin]);

  const toggle = () => {
    if (reduced) window.alert("الثلج متوقف لأن جهازك مفعّل عليه «تقليل الحركة» أو «إزالة الرسوم المتحركة». غيّره من إعدادات إمكانية الوصول لو عايز تشوف الثلج.");
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {}
  };

  if (!SNOW_ENABLED || !ready) return null;
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
          right: 10,
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${BTN_BOTTOM}px)`,
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "1px solid #cfe0f7",
          background: "rgba(255,255,255,0.8)",
          fontSize: 14,
          lineHeight: 1,
          opacity: on ? 0.8 : 0.5,
          zIndex: 45,
        }}
      >
        ❄️
      </button>
    </>
  );
}
