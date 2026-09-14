#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/components/site/ServicesSection.tsx')
t = p.read_text(encoding='utf-8')

old1 = 'const services = await prisma.service.findMany({'
new1 = 'const services = (await prisma.service.findMany({'

old2 = '  });\n\n  if (services.length === 0) return null;'
new2 = '  })).filter((s) => Number(s.discountPrice ?? s.price) > 0);\n\n  if (services.length === 0) return null;'

if old1 in t and old2 in t:
    t = t.replace(old1, new1, 1)
    t = t.replace(old2, new2, 1)
    p.write_text(t, encoding='utf-8')
    print('ServicesSection.tsx: تم تحديث الفلتر - هتظهر الخدمات المسعّرة بس')
else:
    print('ServicesSection.tsx: تحذير - النص المتوقع مش موجود، محصلش تعديل')
PY

echo "تم تحديث فلتر الخدمات المسعّرة"
