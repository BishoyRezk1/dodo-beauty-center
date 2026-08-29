import { prisma } from "@/lib/prisma";

/**
 * Simple key/value settings store used for everything the owner can change
 * from the admin dashboard without redeploying: Vodafone Cash number & fee,
 * WhatsApp shop number, Google Maps location, brand colors, etc.
 */

export const SETTING_KEYS = {
  SITE_NAME: "site_name",
  SITE_TAGLINE: "site_tagline",
  PRIMARY_COLOR: "primary_color",
  VODAFONE_NUMBER: "vodafone_number",
  FEE_TYPE: "fee_type", // FIXED | PERCENT
  FEE_VALUE: "fee_value",
  WHATSAPP_SHOP_LINK_NUMBER: "whatsapp_shop_link_number", // international format, no +
  MAP_ADDRESS: "map_address",
  MAP_LAT: "map_lat",
  MAP_LNG: "map_lng",
  MAP_URL: "map_url",
  MAX_CONCURRENT_BOOKINGS: "max_concurrent_bookings"
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.SITE_NAME]: "DoDo Beauty Center",
  [SETTING_KEYS.SITE_TAGLINE]: "جمالك يستحق لمسة راقية",
  [SETTING_KEYS.PRIMARY_COLOR]: "#7A3B47",
  [SETTING_KEYS.VODAFONE_NUMBER]: "01000000000",
  [SETTING_KEYS.FEE_TYPE]: "FIXED",
  [SETTING_KEYS.FEE_VALUE]: "100",
  [SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER]: "201000000000",
  [SETTING_KEYS.MAP_ADDRESS]: "القاهرة، مصر",
  [SETTING_KEYS.MAP_LAT]: "30.0444",
  [SETTING_KEYS.MAP_LNG]: "31.2357",
  [SETTING_KEYS.MAP_URL]: "https://maps.google.com",
  [SETTING_KEYS.MAX_CONCURRENT_BOOKINGS]: "1"
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

export function calculateFee(servicePrice: number, feeType: string, feeValue: number): number {
  if (feeType === "PERCENT") {
    return Math.round(((servicePrice * feeValue) / 100) * 100) / 100;
  }
  return feeValue;
}
