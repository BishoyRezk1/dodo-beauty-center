#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

mkdir -p src/app/api/analytics/track

python - <<'PY'
from pathlib import Path

# 1) موديل الزيارات في الـ schema
p = Path('prisma/schema.prisma')
t = p.read_text(encoding='utf-8')
old = 'model Coupon {'
new = '''model PageView {
  id        String   @id @default(cuid())
  path      String
  createdAt DateTime @default(now())

  @@index([createdAt])
}

model Coupon {'''
if old in t and 'model PageView' not in t:
    t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('schema.prisma: تم إضافة موديل PageView')
else:
    print('schema.prisma: تحذير أو موجود بالفعل')

# 2) API تسجيل الزيارة (عام، محمي بـ Rate Limit)
Path('src/app/api/analytics/track/route.ts').write_text('''import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/analytics/track — public: records one page view. Rate-limited
// generously (real browsing never hits this) to stop bot/spam abuse.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`track:${ip}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path.slice(0, 300) : "/";

  await prisma.pageView.create({ data: { path } }).catch(() => {});

  return NextResponse.json({ ok: true });
}
''', encoding='utf-8')
print('api/analytics/track/route.ts: تم الإنشاء')

# 3) كومبوننت تسجيل الزيارة (عميل)، يشتغل في الموقع العام بس مش في لوحة الإدارة
Path('src/components/site/VisitTracker.tsx').write_text('''"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname || "/" })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
''', encoding='utf-8')
print('VisitTracker.tsx: تم الإنشاء')

# 4) ضيفه في الـ layout الرئيسي
p = Path('src/app/layout.tsx')
t = p.read_text(encoding='utf-8')

old_import = 'import LiquidCursorEffect from "@/components/site/LiquidCursorEffect";'
new_import = 'import LiquidCursorEffect from "@/components/site/LiquidCursorEffect";\nimport VisitTracker from "@/components/site/VisitTracker";'

old_div = '''        <div className="relative z-10">
          {children}
          <LiquidCursorEffect />
        </div>'''
new_div = '''        <div className="relative z-10">
          {children}
          <LiquidCursorEffect />
          <VisitTracker />
        </div>'''

if old_import in t and old_div in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_div, new_div, 1)
    p.write_text(t, encoding='utf-8')
    print('layout.tsx: تم تفعيل تسجيل الزيارات')
else:
    print('تحذير - layout.tsx مش لاقي النص المتوقع')

# 5) ضيف رقم الزيارات في /api/admin/stats
p = Path('src/app/api/admin/stats/route.ts')
t = p.read_text(encoding='utf-8')

old_destructure = '''  const [
    total,
    todayCount,
    upcoming,
    pending,
    confirmed,
    cancelled,
    customersCount,
    feeAgg,
    recentBookings,
    popularServices
  ] = await Promise.all(['''
new_destructure = '''  const [
    total,
    todayCount,
    upcoming,
    pending,
    confirmed,
    cancelled,
    customersCount,
    feeAgg,
    recentBookings,
    popularServices,
    totalVisits,
    todayVisits
  ] = await Promise.all(['''

old_promises_end = '''    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5
    })
  ]);'''
new_promises_end = '''    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5
    }),
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } })
  ]);'''

old_return = '''    totalFees: feeAgg._sum.amount || 0,
    recentBookings,
    popularServices: popular
  });'''
new_return = '''    totalFees: feeAgg._sum.amount || 0,
    recentBookings,
    popularServices: popular,
    siteVisits: { total: totalVisits, today: todayVisits }
  });'''

checks = [(old_destructure, new_destructure), (old_promises_end, new_promises_end), (old_return, new_return)]
missing = [i for i, (o, _) in enumerate(checks, 1) if o not in t]
if missing:
    print(f'تحذير - stats/route.ts: أجزاء مش موجودة {missing}')
else:
    for old, new in checks:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('stats/route.ts: تم إضافة رقم الزيارات')

# 6) ضيف كارت الزيارات في صفحة الداشبورد
p = Path('src/app/admin/(protected)/dashboard/page.tsx')
t = p.read_text(encoding='utf-8')

old_interface = '''  recentBookings: any[];
  popularServices: { service: string; count: number }[];
}'''
new_interface = '''  recentBookings: any[];
  popularServices: { service: string; count: number }[];
  siteVisits: { total: number; today: number };
}'''

old_cards = '''    { label: "عدد العملاء", value: stats.customersCount },
    { label: "إجمالي رسوم الحجز", value: formatEGP(stats.totalFees) }
  ];'''
new_cards = '''    { label: "عدد العملاء", value: stats.customersCount },
    { label: "إجمالي رسوم الحجز", value: formatEGP(stats.totalFees) },
    { label: "زيارات الموقع", value: stats.siteVisits.total },
    { label: "زيارات اليوم", value: stats.siteVisits.today }
  ];'''

checks2 = [(old_interface, new_interface), (old_cards, new_cards)]
missing2 = [i for i, (o, _) in enumerate(checks2, 1) if o not in t]
if missing2:
    print(f'تحذير - dashboard/page.tsx: أجزاء مش موجودة {missing2}')
else:
    for old, new in checks2:
        t = t.replace(old, new, 1)
    p.write_text(t, encoding='utf-8')
    print('dashboard/page.tsx: تم إضافة كارت الزيارات')
PY

echo "تم بناء عداد زيارات الموقع"
