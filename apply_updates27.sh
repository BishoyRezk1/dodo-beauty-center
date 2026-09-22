#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/layout.tsx')
t = p.read_text(encoding='utf-8')

old = '''const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-body"
});'''
new = '''const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-body"
});'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('layout.tsx: تم تصليح مشكلة الخط (Almarai)')
else:
    print('تحذير - النص المتوقع مش موجود')
PY

echo "تم تصليح مشكلة الـ Build"
