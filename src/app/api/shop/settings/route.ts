import { NextResponse } from "next/server";
import { getShopSettings } from "@/lib/shop/settings";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getShopSettings();
    return NextResponse.json(
      {
        open: s.open,
        deliveryFee: s.deliveryFee,
        freeDeliveryOver: s.freeDeliveryOver,
        minOrder: s.minOrder,
        deliveryPolicy: s.deliveryPolicy,
        vodafoneNumber: s.vodafoneNumber,
        paymentInstructions: s.paymentInstructions
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return fail("تعذر تحميل إعدادات المتجر", 500);
  }
}
