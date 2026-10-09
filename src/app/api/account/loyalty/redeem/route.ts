import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getCustomer } from "@/lib/customer-session";
import { getLoyaltyConfig } from "@/lib/loyalty";

const schema = z.object({ rewardId: z.string().min(1).max(40) });

function genCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += abc[b[i] % abc.length];
  return `ZINA-${s}`;
}

export async function POST(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const { allowed } = rateLimit(`loyalty-redeem:${c.id}`, 5, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "محاولات كتيرة، استني شوية." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const cfg = await getLoyaltyConfig();
  if (!cfg.enabled) return NextResponse.json({ error: "نظام النقاط متوقف حاليًا" }, { status: 400 });
  const reward = cfg.rewards.find((r) => r.id === parsed.data.rewardId);
  if (!reward) return NextResponse.json({ error: "المكافأة غير موجودة" }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize concurrent redemptions for the same customer.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${c.id}))::text AS l`;
      const agg = await tx.loyaltyTransaction.aggregate({ where: { customerId: c.id }, _sum: { points: true } });
      const balance = agg._sum.points ?? 0;
      if (balance < reward.cost) return { error: "نقاطك مش كفاية للمكافأة دي" } as const;

      const code = genCode();
      const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await tx.coupon.create({
        data: { code, discountPercent: reward.discountPercent, maxUses: 1, expiresAt }
      });
      await tx.loyaltyTransaction.create({
        data: {
          customerId: c.id,
          points: -reward.cost,
          type: "REDEEM",
          reason: `استبدال: ${reward.title} — الكود ${code}`
        }
      });
      return { code, expiresAt } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, code: result.code, expiresAt: result.expiresAt });
  } catch {
    return NextResponse.json({ error: "تعذّر الاستبدال، حاولي تاني." }, { status: 500 });
  }
}
