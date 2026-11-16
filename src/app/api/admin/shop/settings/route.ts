import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { setSetting } from "@/lib/settings";
import { getShopSettings, SHOP_KEYS } from "@/lib/shop/settings";
import { fail } from "@/lib/shop/utils";
import { normalizePhoneForWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const schema = z.object({
  open: z.boolean(),
  whatsapp: z.string().trim().max(20),
  vodafoneNumber: z.string().trim().max(20),
  paymentInstructions: z.string().max(1000),
  deliveryFee: z.coerce.number().min(0).max(100000),
  freeDeliveryOver: z.coerce.number().min(0).max(10000000),
  minOrder: z.coerce.number().min(0).max(10000000),
  deliveryPolicy: z.string().max(1000)
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(await getShopSettings());
  } catch {
    return fail("تعذر تحميل الإعدادات", 500);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("راجعي القيم المدخلة");
  const d = parsed.data;
  const wa = d.whatsapp ? normalizePhoneForWhatsApp(d.whatsapp) : "";
  if (wa && (wa.length < 11 || wa.length > 15)) return fail("رقم الواتساب غير صالح");
  try {
    await Promise.all([
      setSetting(SHOP_KEYS.OPEN, d.open ? "true" : "false"),
      setSetting(SHOP_KEYS.WHATSAPP, wa),
      setSetting(SHOP_KEYS.VODAFONE, d.vodafoneNumber),
      setSetting(SHOP_KEYS.PAY_INSTRUCTIONS, d.paymentInstructions),
      setSetting(SHOP_KEYS.DELIVERY_FEE, String(d.deliveryFee)),
      setSetting(SHOP_KEYS.FREE_DELIVERY_OVER, String(d.freeDeliveryOver)),
      setSetting(SHOP_KEYS.MIN_ORDER, String(d.minOrder)),
      setSetting(SHOP_KEYS.DELIVERY_POLICY, d.deliveryPolicy)
    ]);
    return NextResponse.json(await getShopSettings());
  } catch {
    return fail("تعذر حفظ الإعدادات", 500);
  }
}
