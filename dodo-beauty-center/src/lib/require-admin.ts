import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Call at the top of any admin-only API route. Returns a 401 response to
 * short-circuit the handler if there's no valid admin session, or null if
 * the request is authorized.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح لك بالدخول" }, { status: 401 });
  }
  return null;
}
