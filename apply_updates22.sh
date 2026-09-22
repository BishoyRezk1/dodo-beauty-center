#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

# 1) تفعيل التأثير المائي على الموبايل (اللمس) كمان
p = Path('src/components/site/LiquidCursorEffect.tsx')
t = p.read_text(encoding='utf-8')

old1 = '''    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReducedMotion || !hasFinePointer) return;'''
new1 = '''    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;'''

old2 = '''    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
    }
    window.addEventListener("mousemove", onMove);'''
new2 = '''    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
    }
    window.addEventListener("mousemove", onMove);

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      target.x = touch.clientX;
      target.y = touch.clientY;
    }
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchMove, { passive: true });'''

old3 = '''    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousemove", onCardMove);
      document.removeEventListener("mouseleave", onCardLeave);
    };'''
new3 = '''    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchMove);
      document.removeEventListener("mousemove", onCardMove);
      document.removeEventListener("mouseleave", onCardLeave);
    };'''

checks = [(old1, new1), (old2, new2), (old3, new3)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]
if missing:
    print(f'تحذير - LiquidCursorEffect.tsx: أجزاء مش موجودة {missing}')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('LiquidCursorEffect.tsx: تم تفعيله على اللمس/الموبايل')

# 2) حذف عرض الزمن من كارت الخدمة
p = Path('src/components/site/ServiceCard.tsx')
t = p.read_text(encoding='utf-8')

old = '''        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            ⏱️ {durationMin} دقيقة
          </span>

          {status === "COMING_SOON" ? ('''
new = '''        <div className="mb-4 flex items-center justify-end">
          {status === "COMING_SOON" ? ('''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('ServiceCard.tsx: تم حذف عرض الزمن')
else:
    print('تحذير - ServiceCard.tsx مش لاقي النص المتوقع')

# 3) حذف عرض الزمن من خطوة اختيار الخدمة في الحجز
p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

old = '''                      <p className="font-bold text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal/50">⏱️ {s.durationMin} دقيقة</p>
                      <span className="font-display font-extrabold text-wine">'''
new = '''                      <p className="font-bold text-charcoal">{s.name}</p>
                      <span className="font-display font-extrabold text-wine">'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم حذف عرض الزمن')
else:
    print('تحذير - BookingFlow.tsx مش لاقي النص المتوقع')
PY

echo "تم تفعيل التأثير على الموبايل وحذف عرض الزمن"
