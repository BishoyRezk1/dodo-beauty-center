import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, FB_COOKIE_NAME } from "@/lib/facebook-auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(FB_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ loggedIn: false });

  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ loggedIn: false });

  return NextResponse.json({ loggedIn: true, name: session.name });
}
