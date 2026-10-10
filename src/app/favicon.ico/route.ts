import { NextResponse } from "next/server";
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/pwa-icon?size=64", req.url), 308);
}
