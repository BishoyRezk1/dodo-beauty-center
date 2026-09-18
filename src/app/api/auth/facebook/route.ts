import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildFacebookAuthUrl } from "@/lib/facebook-auth";

// GET /api/auth/facebook — بداية تسجيل دخول العميل بالفيسبوك (لكتابة تقييم بس،
// منفصل تمامًا عن نظام دخول لوحة الإدارة).
export async function GET(req: NextRequest) {
  const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = buildFacebookAuthUrl(redirectUri, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  });
  return res;
}
