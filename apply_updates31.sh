#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

# 1) شيل السعر من كارت الخدمة في الصفحة الرئيسية
p = Path('src/components/site/ServiceCard.tsx')
t = p.read_text(encoding='utf-8')

old = '''        <div className="mb-4 flex items-center justify-end">
          {status === "COMING_SOON" ? (
            <span className="font-bold text-amber-600">سيتم تحديد السعر</span>
          ) : hasDiscount ? (
            <div className="text-right">
              <span className="mr-2 text-sm text-gray-400 line-through">
                {price} ج.م
              </span>
              <span className="font-bold text-pink-600">
                {discountPrice} ج.م
              </span>
            </div>
          ) : (
            <span className="font-bold text-pink-600">{price} ج.م</span>
          )}
        </div>

        {hasDiscount && status === "AVAILABLE" && (
          <div className="mb-4">
            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              عرض خاص
            </span>
          </div>
        )}'''

new = '''        {hasDiscount && status === "AVAILABLE" && (
          <div className="mb-4">
            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              عرض خاص
            </span>
          </div>
        )}'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('ServiceCard.tsx: تم إخفاء السعر')
else:
    print('تحذير - ServiceCard.tsx مش لاقي النص المتوقع')

# 2) شيل السعر من خطوة اختيار الخدمة في الحجز
p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

old2 = '''                      <p className="font-bold text-charcoal">{s.name}</p>
                      <span className="font-display font-extrabold text-wine">
                        {formatEGP(s.discountPrice ?? s.price)}
                      </span>
                    </button>'''

new2 = '''                      <p className="font-bold text-charcoal">{s.name}</p>
                    </button>'''

if old2 in t:
    t = t.replace(old2, new2, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم إخفاء السعر')
else:
    print('تحذير - BookingFlow.tsx مش لاقي النص المتوقع')
PY

echo "تم إخفاء الأسعار من عرض الخدمات"
