import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForAccessToken,
  getFacebookProfile,
  createSessionToken,
  FB_COOKIE_NAME,
  FB_SESSION_TTL_SECONDS
} from "@/lib/facebook-auth";

// GET /api/auth/facebook/callback — فيسبوك بيرجع هنا بعد ما العميل يسجل دخول.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("fb_oauth_state")?.value;

  const reviewUrl = new URL("/review", req.nextUrl.origin);

  if (!code || !state || !savedState || state !== savedState) {
    reviewUrl.searchParams.set("fb_error", "1");
    return NextResponse.redirect(reviewUrl);
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/facebook/callback`;
    const accessToken = await exchangeCodeForAccessToken(code, redirectUri);
    const profile = await getFacebookProfile(accessToken);
    const sessionToken = createSessionToken(profile.id, profile.name);

    const res = NextResponse.redirect(reviewUrl);
    res.cookies.set(FB_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: FB_SESSION_TTL_SECONDS,
      path: "/"
    });
    res.cookies.set("fb_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch {
    reviewUrl.searchParams.set("fb_error", "1");
    return NextResponse.redirect(reviewUrl);
  }
}
