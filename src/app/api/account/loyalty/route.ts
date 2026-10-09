import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer-session";
import { getLoyaltyConfig, getTotals, levelFor } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const cfg = await getLoyaltyConfig();
  if (!cfg.enabled) return NextResponse.json({ enabled: false });

  const [totals, history] = await Promise.all([
    getTotals(c.id),
    prisma.loyaltyTransaction.findMany({
      where: { customerId: c.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, points: true, type: true, reason: true, createdAt: true }
    })
  ]);

  return NextResponse.json({
    enabled: true,
    ...totals,
    level: levelFor(totals.lifetime, cfg),
    rewards: cfg.rewards,
    history
  });
}
