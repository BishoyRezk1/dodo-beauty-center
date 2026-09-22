#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/app/admin/(protected)/services/page.tsx')
t = p.read_text(encoding='utf-8')

# 1) ضيف state للفلتر
old1 = '  const [catalogLoading, setCatalogLoading] = useState(false);'
new1 = '''  const [catalogLoading, setCatalogLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | null>(null);'''

# 2) اعمل الكروت التلاتة أزرار قابلة للدوس، وفعّل/الغِ الفلتر
old2 = '''      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">متاحة</p>
          <p className="mt-1 text-2xl font-extrabold text-green-600">
            {availableCount}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">قريبًا</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {comingSoonCount}
          </p>
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs text-charcoal/50">مخفية</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">
            {hiddenCount}
          </p>
        </div>
      </div>'''

new2 = '''      <div className="mb-6 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() =>
            setStatusFilter((f) => (f === "AVAILABLE" ? null : "AVAILABLE"))
          }
          className={`card p-4 text-center transition ${
            statusFilter === "AVAILABLE" ? "ring-2 ring-green-600" : ""
          }`}
        >
          <p className="text-xs text-charcoal/50">متاحة</p>
          <p className="mt-1 text-2xl font-extrabold text-green-600">
            {availableCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((f) => (f === "COMING_SOON" ? null : "COMING_SOON"))
          }
          className={`card p-4 text-center transition ${
            statusFilter === "COMING_SOON" ? "ring-2 ring-amber-600" : ""
          }`}
        >
          <p className="text-xs text-charcoal/50">قريبًا</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {comingSoonCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((f) => (f === "HIDDEN" ? null : "HIDDEN"))
          }
          className={`card p-4 text-center transition ${
            statusFilter === "HIDDEN" ? "ring-2 ring-red-600" : ""
          }`}
        >
          <p className="text-xs text-charcoal/50">مخفية</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">
            {hiddenCount}
          </p>
        </button>
      </div>

      {statusFilter && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-blush/40 px-4 py-2 text-sm">
          <span className="font-bold text-charcoal">
            بتعرضي بس: {statusOptions.find(([v]) => v === statusFilter)?.[1]}
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            className="font-bold text-wine underline"
          >
            عرض الكل
          </button>
        </div>
      )}'''

# 3) استخدم القائمة المفلترة بدل الكل
old3 = '''      <div className="flex flex-col gap-3">
        {services.map((s) => ('''
new3 = '''      <div className="flex flex-col gap-3">
        {(statusFilter ? services.filter((s) => s.status === statusFilter) : services).map((s) => ('''

old4 = '''        {services.length === 0 && (
          <div className="card p-8 text-center text-charcoal/50">
            لا توجد خدمات. استخدمي "إضافة قائمة الخدمات الأساسية".
          </div>
        )}'''
new4 = '''        {(statusFilter ? services.filter((s) => s.status === statusFilter) : services).length === 0 && (
          <div className="card p-8 text-center text-charcoal/50">
            {statusFilter
              ? "لا توجد خدمات بهذه الحالة."
              : 'لا توجد خدمات. استخدمي "إضافة قائمة الخدمات الأساسية".'}
          </div>
        )}'''

checks = [(old1, new1), (old2, new2), (old3, new3), (old4, new4)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]

if missing:
    print(f'تحذير - أجزاء مش موجودة: {missing}')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('services/page.tsx: تم تفعيل الفلترة بالدوس على الكروت')
PY

echo "تم إضافة فلترة الخدمات بالدوس على الإحصائيات"
