#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/booking/BookingFlow.tsx')
t = p.read_text(encoding='utf-8')

# 1) ضيف category للـ interface
old1 = '''  status?: "AVAILABLE" | "COMING_SOON" | "HIDDEN";
}'''
new1 = '''  status?: "AVAILABLE" | "COMING_SOON" | "HIDDEN";
  category?: string;
}'''

# 2) ضيف categoryNames + تجميع الخدمات بالفئة قبل حساب الـ fee
old2 = '  const fee = useMemo(() => {'
new2 = '''  const categoryNames: Record<string, string> = {
    hair: "الشعر",
    "hair-gel": "Hair Gel",
    "hard-gel": "هارد جيل",
    skin: "البشرة",
    makeup: "المكياج",
    nails: "الأظافر",
    "hair-removal": "إزالة الشعر",
    "body-care": "العناية",
    bridal: "العروس",
    general: "خدمات أخرى"
  };

  const groupedServices = useMemo(() => {
    return services.reduce<Record<string, Service[]>>((acc, s) => {
      const key = s.category || "general";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [services]);

  const fee = useMemo(() => {'''

# 3) استبدال خطوة اختيار الخدمة بـ Grid Cards مقسّمة بالفئة
old3 = '''      {step === "service" && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">اختاري الخدمة</h2>
          <div className="flex flex-col gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedService(s);
                  setStep("datetime");
                }}
                className={`card flex items-center justify-between p-4 text-right transition hover:border-wine ${
                  selectedService?.id === s.id ? "border-wine" : ""
                }`}
              >
                <div>
                  <p className="font-bold text-charcoal">{s.name}</p>
                  <p className="text-xs text-charcoal/50">{s.durationMin} دقيقة</p>
                </div>
                <span className="font-display font-extrabold text-wine">
                  {Number(s.discountPrice ?? s.price) > 0
                    ? formatEGP(s.discountPrice ?? s.price)
                    : "قريباً"}
                </span>
              </button>
            ))}
            {services.length === 0 && <p className="text-charcoal/50">لا توجد خدمات متاحة حاليًا</p>}
          </div>
        </div>
      )}'''

new3 = '''      {step === "service" && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">اختاري الخدمة</h2>
          <div className="flex flex-col gap-8">
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-bold text-charcoal/60">
                  {categoryNames[category] || "خدمات أخرى"}
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {categoryServices.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setStep("datetime");
                      }}
                      className={`card flex flex-col items-start gap-2 p-4 text-right transition hover:border-wine hover:-translate-y-0.5 ${
                        selectedService?.id === s.id ? "border-wine bg-wine/5" : ""
                      }`}
                    >
                      <p className="font-bold text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal/50">⏱️ {s.durationMin} دقيقة</p>
                      <span className="font-display font-extrabold text-wine">
                        {formatEGP(s.discountPrice ?? s.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {services.length === 0 && <p className="text-charcoal/50">لا توجد خدمات متاحة حاليًا</p>}
          </div>
        </div>
      )}'''

checks = [(old1, new1), (old2, new2), (old3, new3)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]

if missing:
    print(f'تحذير - الأجزاء دي مش موجودة زي المتوقع: {missing}')
    print('محصلش أي تعديل، الملف زي ما هو')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('BookingFlow.tsx: تم تحديث شكل اختيار الخدمة (Grid + تقسيم بالفئات)')
PY

echo "تم تحديث شكل خطوة اختيار الخدمة في الحجز"
