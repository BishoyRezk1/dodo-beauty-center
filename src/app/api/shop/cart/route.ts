import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { fail, num } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(64), qty: z.coerce.number().int().min(1).max(999) }))
    .min(1)
    .max(50)
});

// Returns the CURRENT price/stock for cart items. The browser's copy is never trusted.
export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`shopcart:${getClientIp(req)}`, 60, 60 * 1000);
  if (!allowed) return fail("محاولات كتيرة، استني شوية", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("بيانات غير صالحة");
  try {
    const ids = Array.from(new Set(parsed.data.items.map((i) => i.productId)));
    const rows = await prisma.shopProduct.findMany({ where: { id: { in: ids }, isActive: true, isArchived: false } });
    return NextResponse.json(
      {
        items: rows.map((p) => ({
          productId: p.id,
          slug: p.slug,
          name: p.name,
          imageUrl: p.imageUrl,
          price: num(p.price),
          comparePrice: p.comparePrice != null ? num(p.comparePrice) : null,
          stock: p.stock
        }))
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return fail("تعذر التحقق من المنتجات", 500);
  }
}
