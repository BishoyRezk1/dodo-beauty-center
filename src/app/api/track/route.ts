import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const dec = (v: string | null) => {
  try { return v ? decodeURIComponent(v) : null; } catch { return v; }
};

export async function POST(req: Request) {
  try {
    const { visitorId, path } = await req.json();
    if (typeof visitorId !== "string" || !visitorId || visitorId.length > 64)
      return NextResponse.json({ ok: false }, { status: 400 });

    const h = req.headers;
    const ua = h.get("user-agent") || "";
    const device = /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop";
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

    await prisma.visitorLog.upsert({
      where: { visitorId_day: { visitorId, day } },
      update: {},
      create: {
        visitorId,
        day,
        country: h.get("x-vercel-ip-country"),
        region: dec(h.get("x-vercel-ip-country-region")),
        city: dec(h.get("x-vercel-ip-city")),
        path: typeof path === "string" ? path.slice(0, 200) : null,
        device,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
