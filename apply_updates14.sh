#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

old = 'مرحبًا DoDo Beauty Center 🌸'
new = 'مرحبًا Zina Nails 🌸'

count = t.count(old)
if count == 0:
    print('تحذير - النص المتوقع مش موجود، محصلش تعديل')
else:
    t = t.replace(old, new)
    p.write_text(t, encoding='utf-8')
    print(f'BookingFlow.tsx: تم تغيير الاسم في {count} رسالة واتساب')
PY

echo "تم تحديث اسم البراند في رسائل الواتساب"
