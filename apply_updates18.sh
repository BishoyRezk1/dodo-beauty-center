#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

# 1) إنشاء ملف الـ rate limiter
rate_limit_lib = '''type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limiter keyed by IP + route. Free, no external
 * service. Good enough to stop basic spam/abuse on public endpoints.
 * Note: resets on cold start and isn't shared across serverless instances,
 * so it's a best-effort throttle, not a hard guarantee.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
'''

p = Path('src/lib/rate-limit.ts')
p.write_text(rate_limit_lib, encoding='utf-8')
print('src/lib/rate-limit.ts: تم الإنشاء')

# 2) حماية POST /api/bookings
p = Path('src/app/api/bookings/route.ts')
t = p.read_text(encoding='utf-8')

old_import = 'import { z } from "zod";'
new_import = 'import { z } from "zod";\nimport { rateLimit, getClientIp } from "@/lib/rate-limit";'

old_fn = '''// POST /api/bookings — public: submit a new booking request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();'''
new_fn = '''// POST /api/bookings — public: submit a new booking request
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`bookings:${ip}`, 5, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "محاولات كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();'''

if old_import in t and old_fn in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_fn, new_fn, 1)
    p.write_text(t, encoding='utf-8')
    print('bookings/route.ts: تم إضافة Rate Limit')
else:
    print('تحذير - bookings/route.ts مش لاقي النص المتوقع')

# 3) حماية POST /api/coupons/validate
p = Path('src/app/api/coupons/validate/route.ts')
t = p.read_text(encoding='utf-8')

old_import = 'import { z } from "zod";'
new_import = 'import { z } from "zod";\nimport { rateLimit, getClientIp } from "@/lib/rate-limit";'

old_fn = '''export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);'''
new_fn = '''export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`coupon:${ip}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "محاولات كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);'''

if old_import in t and old_fn in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_fn, new_fn, 1)
    p.write_text(t, encoding='utf-8')
    print('coupons/validate/route.ts: تم إضافة Rate Limit')
else:
    print('تحذير - coupons/validate/route.ts مش لاقي النص المتوقع')

# 4) حماية POST /api/upload
p = Path('src/app/api/upload/route.ts')
t = p.read_text(encoding='utf-8')

old_import = 'import { uploadImage } from "@/lib/storage";'
new_import = 'import { uploadImage } from "@/lib/storage";\nimport { rateLimit, getClientIp } from "@/lib/rate-limit";'

old_fn = '''export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();'''
new_fn = '''export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`upload:${ip}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "محاولات رفع كتيرة، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();'''

if old_import in t and old_fn in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_fn, new_fn, 1)
    p.write_text(t, encoding='utf-8')
    print('upload/route.ts: تم إضافة Rate Limit')
else:
    print('تحذير - upload/route.ts مش لاقي النص المتوقع')

# 5) حماية GET /api/bookings/availability
p = Path('src/app/api/bookings/availability/route.ts')
t = p.read_text(encoding='utf-8')

old_import = 'import { getSetting, SETTING_KEYS } from "@/lib/settings";'
new_import = 'import { getSetting, SETTING_KEYS } from "@/lib/settings";\nimport { rateLimit, getClientIp } from "@/lib/rate-limit";'

old_fn = '''export async function GET(req: NextRequest) {
  try {
    const serviceId = req.nextUrl.searchParams.get("serviceId");'''
new_fn = '''export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`availability:${ip}`, 30, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "طلبات كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  try {
    const serviceId = req.nextUrl.searchParams.get("serviceId");'''

if old_import in t and old_fn in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_fn, new_fn, 1)
    p.write_text(t, encoding='utf-8')
    print('bookings/availability/route.ts: تم إضافة Rate Limit')
else:
    print('تحذير - bookings/availability/route.ts مش لاقي النص المتوقع')
PY

echo "تم إضافة حماية Rate Limiting على الـ API العامة"
