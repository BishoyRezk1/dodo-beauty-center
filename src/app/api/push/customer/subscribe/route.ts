import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const endpoint = b?.endpoint;
    const p256dh = b?.keys?.p256dh;
    const auth = b?.keys?.auth;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    await prisma.customerPushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth },
      create: { endpoint, p256dh, auth, userAgent: req.headers.get("user-agent")?.slice(0, 200) },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
