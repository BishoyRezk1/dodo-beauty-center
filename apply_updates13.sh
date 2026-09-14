#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

# 1) ضيف فانكشن جديدة لتأكيد الحجز عبر واتساب بعد openWhatsAppBooking
old1 = '''    window.open(whatsappUrl, "_blank");
  }

  async function handleSubmit() {'''

new1 = '''    window.open(whatsappUrl, "_blank");
  }

  function openWhatsAppConfirmation() {
    if (!selectedService || !bookingNumber) return;

    const whatsappNumber = "201001821352";

    const message = [
      "مرحبًا DoDo Beauty Center 🌸",
      "",
      "تم إنشاء طلب حجز جديد ✅",
      "",
      `رقم الحجز: ${bookingNumber}`,
      `الاسم: ${name.trim()}`,
      `رقم الهاتف: ${phone.trim()}`,
      `الخدمة: ${selectedService.name}`,
      `التاريخ: ${date || "لم يتم تحديده"}`,
      `الوقت: ${time || "لم يتم تحديده"}`,
      "",
      "برجاء مراجعة التحويل وتأكيد الموعد 💚"
    ].join("\\n");

    const whatsappUrl =
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  }

  async function handleSubmit() {'''

# 2) ضيف زرار في شاشة "تم استلام طلب الحجز بنجاح"
old2 = '''          <p className="text-sm text-charcoal/60">سيتم مراجعة التحويل وتأكيد الحجز عبر واتساب.</p>
        </div>
      )}'''

new2 = '''          <p className="mb-6 text-sm text-charcoal/60">سيتم مراجعة التحويل وتأكيد الحجز عبر واتساب.</p>
          <button
            type="button"
            onClick={openWhatsAppConfirmation}
            className="w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
          >
            💬 إرسال تأكيد الحجز عبر واتساب لدودو
          </button>
        </div>
      )}'''

checks = [(old1, new1), (old2, new2)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]

if missing:
    print(f'تحذير - الأجزاء دي مش موجودة زي المتوقع: {missing}')
    print('محصلش أي تعديل، الملف زي ما هو')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم إضافة زرار تأكيد الحجز عبر واتساب')
PY

echo "تم تحديث شاشة تأكيد الحجز"
