import { NextResponse } from "next/server";
import { prevMonthCairo, saveMonth } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const month = prevMonthCairo();
  await saveMonth(month);
  return NextResponse.json({ ok: true, month });
}
