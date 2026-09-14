#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/components/site/ServicesSection.tsx')
t = p.read_text(encoding='utf-8')
old = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
new = 'grid grid-cols-2 gap-4 max-[380px]:grid-cols-1 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-3 lg:gap-6'
if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('ServicesSection.tsx: تم تحديث الـ grid')
else:
    print('ServicesSection.tsx: تحذير - النص المتوقع مش موجود')

p = Path('src/components/site/ServiceCard.tsx')
t = p.read_text(encoding='utf-8')

replacements = [
    ('h-52 w-full object-cover',
     'h-36 w-full object-cover sm:h-44 md:h-52'),
    ('flex h-52 items-center justify-center bg-gray-100 text-5xl',
     'flex h-36 items-center justify-center bg-gray-100 text-3xl sm:h-44 sm:text-4xl md:h-52 md:text-5xl'),
    ('<div className="p-5">',
     '<div className="p-3 sm:p-4 md:p-5">'),
    ('<h3 className="text-xl font-bold text-gray-900">{name}</h3>',
     '<h3 className="text-base font-bold text-gray-900 sm:text-lg md:text-xl">{name}</h3>'),
    ('rounded-xl bg-pink-600 px-4 py-3 text-center font-bold text-white transition hover:bg-pink-700',
     'rounded-xl bg-pink-600 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-pink-700 sm:px-4 sm:py-3 sm:text-base'),
    ('rounded-xl bg-gray-100 px-4 py-3 text-center font-bold text-gray-500',
     'rounded-xl bg-gray-100 px-3 py-2.5 text-center text-sm font-bold text-gray-500 sm:px-4 sm:py-3 sm:text-base'),
]

changed = False
for old, new in replacements:
    if old in t:
        t = t.replace(old, new, 1)
        changed = True
    else:
        print(f'ServiceCard.tsx: تحذير - النص ده مش موجود: {old[:45]}...')

if changed:
    p.write_text(t, encoding='utf-8')
print('ServiceCard.tsx: تم التحديث')
PY

echo "تم تحديث عرض الخدمات (Grid) بنجاح"
