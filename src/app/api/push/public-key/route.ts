import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The VAPID public key is meant to be public; this avoids needing a NEXT_PUBLIC_ copy.
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "push not configured" }, { status: 503 });
  return NextResponse.json({ key });
}
