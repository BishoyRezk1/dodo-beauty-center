#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

old = "DoDo Beauty Center"
new = "Zina Nails"

files = [
    "src/components/site/LocationSection.tsx",
    "src/app/admin/layout.tsx",
    "src/app/api/reports/export/route.ts",
    "src/app/api/bootstrap/route.ts",
    "src/app/layout.tsx",
    "src/app/review/page.tsx",
    "src/lib/settings.ts",
    "src/lib/whatsapp.ts",
]

total = 0
for f in files:
    p = Path(f)
    t = p.read_text(encoding="utf-8")
    count = t.count(old)
    if count == 0:
        print(f"{f}: مفيش أي حاجة اتغيرت (النص مش موجود)")
        continue
    t = t.replace(old, new)
    p.write_text(t, encoding="utf-8")
    total += count
    print(f"{f}: تم تغيير {count} حالة")

print(f"إجمالي التغييرات: {total}")
PY

echo "تم الريبراند الكامل في الكود إلى Zina Nails"
