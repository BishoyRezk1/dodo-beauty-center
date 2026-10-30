import { NextResponse } from "next/server";
import { monthLocked, prevMonthCairo, saveMonth, setLock } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const month = prevMonthCairo();
  if (!(await monthLocked(month))) {
    await saveMonth(month);
    await setLock(month, true);
  }
  return NextResponse.json({ ok: true, month });
}
