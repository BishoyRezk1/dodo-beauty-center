import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const VISITOR_COOKIE = "dodo_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// POST /api/analytics/track
// Records one unique visitor per device every 24 hours.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const { allowed } = rateLimit(`track:${ip}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const existingVisitor = req.cookies.get(VISITOR_COOKIE)?.value;

  // Same visitor/device within 24 hours: do not count again.
  if (existingVisitor) {
    return NextResponse.json({
      ok: true,
      counted: false
    });
  }

  const body = await req.json().catch(() => ({}));
  const path =
    typeof body?.path === "string"
      ? body.path.slice(0, 300)
      : "/";

  await prisma.pageView.create({
    data: { path }
  }).catch(() => {});

  const response = NextResponse.json({
    ok: true,
    counted: true
  });

  response.cookies.set({
    name: VISITOR_COOKIE,
    value: "1",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return response;
}
