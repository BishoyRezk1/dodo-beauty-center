import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/settings";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/settings — public: needed to render Vodafone number, fee, map, etc.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

// PATCH /api/settings — admin only: update one or more settings at once
// Body: { "vodafone_number": "01012345678", "fee_value": "120", ... }
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const entries = Object.entries(body) as [string, string][];
  await Promise.all(entries.map(([key, value]) => setSetting(key, String(value))));

  const settings = await getSettings();
  return NextResponse.json(settings);
}
