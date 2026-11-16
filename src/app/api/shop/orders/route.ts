import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitDb, getClientIp } from "@/lib/rate-limit";
import { getShopSettings } from "@/lib/shop/settings";
import { fail, isUnique, num } from "@/lib/shop/utils";
import { normalizeEgPhone } from "@/lib/shop/phone";

export const dynamic = "force-dynamic";

const shopErr = (m: string) => Object.assign(new Error(m), { isShop: true });
const isShopErr = (e: unknown) => !!(e as { isShop?: boolean } | null)?.isShop;

const schema = z.object({
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  whatsapp: z.string().trim().min(8).max(20),
  governorate: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).nullable().optional(),
  paymentMethod: z.enum(["COD", "VODAFONE_CASH"]),
  transferRef: z.string().trim().max(60).nullable().optional(),
  receiptUrl: z.string().max(500).nullable().optional(),
  idempotencyKey: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  items: z
    .array(z.object({ productId: z.string().min(1).max(64), qty: z.coerce.number().int().min(1).max(99) }))
    .min(1)
    .max(30)
});

const okUrl = (u?: string | null) => !u || u.startsWith("https://") || u.startsWith("/uploads/");

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimitDb(`shoporder:${getClientIp(req)}`, 6, 10 * 60 * 1000);
  if (!allowed) return fail("محاولات كتيرة، استني شوية وجرّبي تاني", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("راجعي البيانات المدخلة");
  const d = parsed.data;

  const phone = normalizeEgPhone(d.phone);
  const whatsapp = normalizeEgPhone(d.whatsapp);
  if (!phone) return fail("رقم الموبايل غير صالح");
  if (!whatsapp) return fail("رقم الواتساب غير صالح");
  if (!okUrl(d.receiptUrl)) return fail("رابط الإيصال غير صالح");

  // A retry with the same key returns the order that is already saved.
  const existing = await prisma.shopOrder.findUnique({
    where: { idempotencyKey: d.idempotencyKey },
    select: { id: true, orderNo: true }
  });
  if (existing) return NextResponse.json({ id: existing.id, orderNo: Number(existing.orderNo), duplicate: true });

  const settings = await getShopSettings().catch(() => null);
  if (!settings) return fail("تعذر تحميل إعدادات المتجر", 500);
  if (!settings.open) return fail("المتجر مغلق مؤقتًا", 403);

  const wanted = new Map<string, number>();
  for (const i of d.items) wanted.set(i.productId, (wanted.get(i.productId) || 0) + i.qty);

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const products = await tx.shopProduct.findMany({
          where: { id: { in: Array.from(wanted.keys()) }, isActive: true, isArchived: false }
        });
        if (products.length !== wanted.size) throw shopErr("فيه منتج في السلة لم يعد متاحًا، حدّثي السلة");

        let subtotalC = 0;
        let savingsC = 0;
        const lines = products.map((p) => {
          const qty = wanted.get(p.id) as number;
          if (p.stock < qty) throw shopErr(`الكمية المتاحة من "${p.name}" هي ${p.stock} فقط`);
          const priceC = Math.round(num(p.price) * 100);
          const compareC = p.comparePrice != null ? Math.round(num(p.comparePrice) * 100) : 0;
          subtotalC += priceC * qty;
          if (compareC > priceC) savingsC += (compareC - priceC) * qty;
          return { p, qty, priceC };
        });

        const subtotal = subtotalC / 100;
        if (settings.minOrder > 0 && subtotal < settings.minOrder) {
          throw shopErr(`الحد الأدنى للطلب ${settings.minOrder} جنيه`);
        }
        const deliveryFee = settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver ? 0 : settings.deliveryFee;

        // Atomic reservation: only succeeds if price is unchanged and stock is still enough.
        for (const l of lines) {
          const r = await tx.shopProduct.updateMany({
            where: { id: l.p.id, isActive: true, isArchived: false, price: l.p.price, stock: { gte: l.qty } },
            data: { stock: { decrement: l.qty } }
          });
          if (r.count === 0) throw shopErr("تغيّر السعر أو الكمية أثناء الطلب، حدّثي السلة وجرّبي تاني");
        }

        const isVodafone = d.paymentMethod === "VODAFONE_CASH";
        const transferRef = isVodafone ? d.transferRef || null : null;
        const receiptUrl = isVodafone ? d.receiptUrl || null : null;

        return tx.shopOrder.create({
          data: {
            customerName: d.customerName,
            phone,
            whatsapp,
            governorate: d.governorate,
            city: d.city,
            address: d.address,
            notes: d.notes || null,
            paymentMethod: d.paymentMethod,
            paymentStatus: isVodafone && (transferRef || receiptUrl) ? "PENDING_REVIEW" : "UNPAID",
            transferRef,
            receiptUrl,
            subtotal,
            discountTotal: savingsC / 100,
            deliveryFee,
            total: (subtotalC + Math.round(deliveryFee * 100)) / 100,
            idempotencyKey: d.idempotencyKey,
            items: {
              create: lines.map((l) => ({
                productId: l.p.id,
                name: l.p.name,
                sku: l.p.sku,
                imageUrl: l.p.imageUrl,
                unitPrice: l.priceC / 100,
                comparePrice: l.p.comparePrice,
                quantity: l.qty,
                lineTotal: (l.priceC * l.qty) / 100
              }))
            }
          },
          select: { id: true, orderNo: true }
        });
      },
      { timeout: 15000 }
    );
    return NextResponse.json({ id: order.id, orderNo: Number(order.orderNo) }, { status: 201 });
  } catch (e) {
    if (isShopErr(e)) return fail((e as Error).message, 409);
    if (isUnique(e)) {
      const again = await prisma.shopOrder
        .findUnique({ where: { idempotencyKey: d.idempotencyKey }, select: { id: true, orderNo: true } })
        .catch(() => null);
      if (again) return NextResponse.json({ id: again.id, orderNo: Number(again.orderNo), duplicate: true });
    }
    return fail("تعذر حفظ الطلب، جرّبي تاني (مش هيتكرر الطلب)", 500);
  }
}
