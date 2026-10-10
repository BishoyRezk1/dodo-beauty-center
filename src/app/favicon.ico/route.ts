import { NextResponse } from "next/server";
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/icons/icon-64.png", req.url), 308);
}
