import { NextResponse } from "next/server";
import { FB_COOKIE_NAME } from "@/lib/facebook-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FB_COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
