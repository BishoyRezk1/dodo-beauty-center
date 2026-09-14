#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

old = '''      const orderedServices = [...svc].sort((a: Service, b: Service) => {
        const aHasPrice = Number(a.discountPrice ?? a.price) > 0;
        const bHasPrice = Number(b.discountPrice ?? b.price) > 0;
        if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
        return 0;
      });'''

new = '''      const orderedServices = [...svc]
        .filter((s: Service) => Number(s.discountPrice ?? s.price) > 0)
        .sort((a: Service, b: Service) => {
          const aHasPrice = Number(a.discountPrice ?? a.price) > 0;
          const bHasPrice = Number(b.discountPrice ?? b.price) > 0;
          if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
          return 0;
        });'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم تحديث الفلتر - هتظهر الخدمات المسعّرة بس في قائمة الحجز')
else:
    print('BookingFlow.tsx: تحذير - النص المتوقع مش موجود، محصلش تعديل')
PY

echo "تم تحديث فلتر الخدمات في صفحة الحجز"
