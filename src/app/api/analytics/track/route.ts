import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitDb, getClientIp } from "@/lib/rate-limit";

const VISITOR_COOKIE = "dodo_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|vercel|lighthouse|headless|curl|wget|python|monitor/i;

function parseUA(ua: string) {
  const l = ua.toLowerCase();
  const device = /ipad|tablet/.test(l) ? "tablet" : /mobi|android|iphone/.test(l) ? "mobile" : "desktop";
  const os = /android/.test(l) ? "Android" : /iphone|ipad|ipod/.test(l) ? "iOS" : /windows/.test(l) ? "Windows" : /mac os/.test(l) ? "macOS" : /linux/.test(l) ? "Linux" : "أخرى";
  let browser = "أخرى";
  if (/fban|fbav/.test(l)) browser = "تطبيق فيسبوك";
  else if (/instagram/.test(l)) browser = "تطبيق إنستجرام";
  else if (/edg\//.test(l)) browser = "Edge";
  else if (/opr\/|opera/.test(l)) browser = "Opera";
  else if (/samsungbrowser/.test(l)) browser = "Samsung Browser";
  else if (/chrome|crios/.test(l)) browser = "Chrome";
  else if (/firefox|fxios/.test(l)) browser = "Firefox";
  else if (/safari/.test(l)) browser = "Safari";
  return { device, os, browser };
}

function sourceOf(ref: string, host: string, ua: string): string {
  let h = "";
  try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { h = ""; }
  if (h && h !== host.replace(/^www\./, "")) {
    if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(h)) return "واتساب";
    if (/facebook|(^|\.)fb\.(com|me)$/.test(h)) return "فيسبوك";
    if (/instagram/.test(h)) return "إنستجرام";
    if (/google/.test(h)) return "جوجل";
    if (/(^|\.)t\.me$|telegram/.test(h)) return "تيليجرام";
    if (/tiktok/.test(h)) return "تيك توك";
    return h.slice(0, 60);
  }
  const l = ua.toLowerCase();
  if (/fban|fbav/.test(l)) return "فيسبوك";
  if (/instagram/.test(l)) return "إنستجرام";
  return "مباشر";
}

function decode(v: string | null) {
  if (!v) return null;
  try { return decodeURIComponent(v).slice(0, 60); } catch { return v.slice(0, 60); }
}

// POST /api/analytics/track
// Records one visit per device every 24 hours. No IP address is stored.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const { allowed } = await rateLimitDb(`track:${ip}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT_RE.test(ua)) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const existingVisitor = req.cookies.get(VISITOR_COOKIE)?.value;
  if (existingVisitor) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const body = await req.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path.slice(0, 300) : "/";
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : "";
  const { device, os, browser } = parseUA(ua);

  await prisma.pageView
    .create({
      data: {
        path,
        device,
        os,
        browser,
        source: sourceOf(referrer, req.nextUrl.hostname, ua),
        country: decode(req.headers.get("x-vercel-ip-country")),
        city: decode(req.headers.get("x-vercel-ip-city")),
      },
    })
    .catch(() => {});

  const response = NextResponse.json({ ok: true, counted: true });
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: "1",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
