import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { getLoyaltyConfig, saveLoyaltyConfig } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getLoyaltyConfig());
}

const schema = z
  .object({
    enabled: z.boolean(),
    perBooking: z.number().int().min(0).max(1000),
    perReview: z.number().int().min(0).max(1000),
    silverAt: z.number().int().min(0).max(1000000),
    goldAt: z.number().int().min(0).max(1000000),
    rewards: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          title: z.string().trim().min(1, "اسم المكافأة مطلوب").max(60),
          cost: z.number().int().min(1).max(100000),
          discountPercent: z.number().int().min(1).max(100)
        })
      )
      .max(10)
  })
  .refine((d) => d.goldAt >= d.silverAt, { message: "حد الذهبية لازم يكون أكبر من أو يساوي الفضية" });

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "بيانات غير صحيحة" }, { status: 400 });
  }
  await saveLoyaltyConfig(parsed.data);
  return NextResponse.json(await getLoyaltyConfig());
}
