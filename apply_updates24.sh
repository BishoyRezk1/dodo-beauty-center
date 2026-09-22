#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/layout.tsx')
t = p.read_text(encoding='utf-8')

old1 = 'import { Cairo } from "next/font/google";'
new1 = 'import { Almarai, El_Messiri } from "next/font/google";'

old2 = '''const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display"
});'''
new2 = '''const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-body"
});

const elMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});'''

old3 = '<html lang="ar" dir="rtl" className={cairo.variable}>'
new3 = '<html lang="ar" dir="rtl" className={`${almarai.variable} ${elMessiri.variable}`}>'

checks = [(old1, new1), (old2, new2), (old3, new3)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]

if missing:
    print(f'تحذير - layout.tsx: أجزاء مش موجودة {missing}')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('layout.tsx: تم تغيير الخط إلى Almarai + El Messiri')
PY

echo "تم تغيير خط الموقع"
