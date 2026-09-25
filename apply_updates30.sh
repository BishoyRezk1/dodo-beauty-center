#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/layout.tsx')
t = p.read_text(encoding='utf-8')

old = '''      <body className="font-body antialiased">
        {children}
        <LiquidCursorEffect />
      </body>'''

new = '''      <body className="font-body antialiased">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/logo-watermark.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "220px auto",
            opacity: 0.08
          }}
        />
        <div className="relative z-10">
          {children}
          <LiquidCursorEffect />
        </div>
      </body>'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('layout.tsx: تم تفعيل العلامة المائية في الموقع كله')
else:
    print('تحذير - النص المتوقع مش موجود')
PY

echo "تم إضافة العلامة المائية"
