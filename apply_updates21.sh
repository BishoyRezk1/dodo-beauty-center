#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

# 1) كومبوننت التأثير المائي + اللمسة الـ 3D
component = '''"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * لمسة بصرية زخرفية للموقع كله: مسار توهج مائي خفيف بيتبع الماوس، مع ميل
 * ثلاثي الأبعاد بسيط للكروت لما الماوس يمر عليها. تأثير شكلي بحت — من غير
 * أي تأثير على التفاعل (pointer-events معطلة تمامًا)، وبيتوقف تلقائيًا على
 * الموبايل، مع إعداد "تقليل الحركة"، وجوه لوحة تحكم الإدارة.
 */
export default function LiquidCursorEffect() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReducedMotion || !hasFinePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);

    const target = { x: width / 2, y: height / 2 };
    const trail: { x: number; y: number }[] = Array.from({ length: 14 }, () => ({
      x: target.x,
      y: target.y
    }));

    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
    }
    window.addEventListener("mousemove", onMove);

    const colors = ["#E85588", "#E91E63", "#FFD9E8"];

    let raf = 0;
    function draw() {
      ctx!.clearRect(0, 0, width, height);

      trail[0].x += (target.x - trail[0].x) * 0.25;
      trail[0].y += (target.y - trail[0].y) * 0.25;
      for (let i = 1; i < trail.length; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * 0.35;
        trail[i].y += (trail[i - 1].y - trail[i].y) * 0.35;
      }

      ctx!.globalCompositeOperation = "multiply";
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        const ratio = i / trail.length;
        const radius = 26 * (1 - ratio * 0.6);
        const alpha = 0.1 * (1 - ratio);
        const color = colors[i % colors.length];
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        gradient.addColorStop(0, hexToRgba(color, alpha));
        gradient.addColorStop(1, hexToRgba(color, 0));
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    function onCardMove(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest?.(".card") as HTMLElement | null;
      document.querySelectorAll<HTMLElement>(".card[data-tilting]").forEach((c) => {
        if (c !== el) {
          c.style.transform = "";
          c.removeAttribute("data-tilting");
        }
      });
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateZ(0)`;
      el.style.transition = "transform 0.05s linear";
      el.setAttribute("data-tilting", "1");
    }
    function onCardLeave() {
      document.querySelectorAll<HTMLElement>(".card[data-tilting]").forEach((c) => {
        c.style.transform = "";
        c.style.transition = "transform 0.3s ease";
        c.removeAttribute("data-tilting");
      });
    }
    document.addEventListener("mousemove", onCardMove);
    document.addEventListener("mouseleave", onCardLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousemove", onCardMove);
      document.removeEventListener("mouseleave", onCardLeave);
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
'''

Path('src/components/site/LiquidCursorEffect.tsx').write_text(component, encoding='utf-8')
print('LiquidCursorEffect.tsx: تم الإنشاء')

# 2) ضيفه في الـ layout الرئيسي (الموقع كله، عدا لوحة الإدارة)
p = Path('src/app/layout.tsx')
t = p.read_text(encoding='utf-8')

old_import = 'import { getSettings } from "@/lib/settings";'
new_import = 'import { getSettings } from "@/lib/settings";\nimport LiquidCursorEffect from "@/components/site/LiquidCursorEffect";'

old_body = '''    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-body antialiased">{children}</body>
    </html>'''
new_body = '''    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-body antialiased">
        {children}
        <LiquidCursorEffect />
      </body>
    </html>'''

if old_import in t and old_body in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_body, new_body, 1)
    p.write_text(t, encoding='utf-8')
    print('layout.tsx: تم تفعيل التأثير المائي')
else:
    print('تحذير - layout.tsx مش لاقي النص المتوقع')
PY

echo "تم إضافة تأثير مائي/3D يتبع الماوس"
