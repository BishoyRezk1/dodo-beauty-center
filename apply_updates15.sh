#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/page.tsx')
t = p.read_text(encoding='utf-8')

old = 'مرحبًا، أريد الاستفسار عن الخدمات في DoDo Beauty Center'
new = 'مرحبًا، أريد الاستفسار عن الخدمات في Zina Nails'

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('page.tsx: تم تحديث اسم البراند في رسالة الاستفسار')
else:
    print('تحذير - النص المتوقع مش موجود، محصلش تعديل')
PY

echo "تم تحديث رسالة الاستفسار في الصفحة الرئيسية"
