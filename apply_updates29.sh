#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

old = '''      {step === "service" && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">اختاري الخدمة</h2>
          <div className="flex flex-col gap-8">'''

new = '''      {step === "service" && (
        <div>
          <h2 className="mb-4 font-display text-2xl font-bold text-charcoal">اختاري الخدمة</h2>

          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-sm font-bold text-charcoal">
              💕 مش متاح معاكي مبلغ الحجز حاليًا؟ ولا يهمك خالص! تواصلي معانا على واتساب، وإحنا هنساعدك بكل حب.
            </p>
            <button
              type="button"
              onClick={openWhatsAppBooking}
              className="mt-3 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
            >
              💬 تواصلي معنا على واتساب
            </button>
          </div>

          <div className="flex flex-col gap-8">'''

if old in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم إضافة رسالة الطمأنة أول خطوة الحجز')
else:
    print('تحذير - النص المتوقع مش موجود')
PY

echo "تم إضافة رسالة الطمأنة في خطوة اختيار الخدمة"
