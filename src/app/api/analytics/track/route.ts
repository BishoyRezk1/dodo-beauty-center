import { NextRequest, NextResponse } from "next/server";
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
