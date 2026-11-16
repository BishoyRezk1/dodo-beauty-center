import { prisma } from "@/lib/prisma";
import { SETTING_KEYS, getSettings } from "@/lib/settings";

export const SHOP_KEYS = {
  OPEN: "shop_open",
  WHATSAPP: "shop_whatsapp",
  VODAFONE: "shop_vodafone_number",
  PAY_INSTRUCTIONS: "shop_payment_instructions",
  DELIVERY_FEE: "shop_delivery_fee",
  FREE_DELIVERY_OVER: "shop_free_delivery_over",
  MIN_ORDER: "shop_min_order",
  DELIVERY_POLICY: "shop_delivery_policy"
} as const;

export async function getShopSettings() {
  const [main, rows] = await Promise.all([
    getSettings(),
    prisma.setting.findMany({ where: { key: { startsWith: "shop_" } } })
  ]);
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return {
    open: (s[SHOP_KEYS.OPEN] ?? "true") !== "false",
    whatsapp: s[SHOP_KEYS.WHATSAPP] || main[SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER] || "",
    vodafoneNumber: s[SHOP_KEYS.VODAFONE] || main[SETTING_KEYS.VODAFONE_NUMBER] || "",
    paymentInstructions:
      s[SHOP_KEYS.PAY_INSTRUCTIONS] || "حوّلي المبلغ على رقم فودافون كاش وأدخلي رقم العملية أو ارفعي صورة الإيصال.",
    deliveryFee: 0, // delivery frozen: arranged via contact
    freeDeliveryOver: 0,
    minOrder: Number(s[SHOP_KEYS.MIN_ORDER] ?? 0) || 0,
    deliveryPolicy: s[SHOP_KEYS.DELIVERY_POLICY] || ""
  };
}
