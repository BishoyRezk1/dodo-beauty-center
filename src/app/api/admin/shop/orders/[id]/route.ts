import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ORDER_STATUSES, PAYMENT_STATUSES, orderDto } from "@/lib/shop/admin";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  adminNotes: z.string().max(2000).nullable().optional()
});

const shopErr = (message: string, status = 409) => Object.assign(new Error(message), { isShop: true, status });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("بيانات غير صالحة");
  const d = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!order) throw shopErr("الطلب غير موجود", 404);

      if (d.status && d.status !== order.status) {
        if (order.status === "CANCELLED") throw shopErr("الطلب الملغي لا يمكن إعادة تفعيله، أنشئي طلبًا جديدًا");
        if (d.status === "CANCELLED") {
          if (order.status === "DELIVERED") throw shopErr("لا يمكن إلغاء طلب تم تسليمه");
          // The flag flips only once, so a double click / retry can never restore twice.
          const flag = await tx.shopOrder.updateMany({
            where: { id: order.id, stockRestored: false },
            data: { stockRestored: true }
          });
          if (flag.count === 1) {
            for (const it of order.items) {
              if (!it.productId) continue;
              await tx.shopProduct.updateMany({
                where: { id: it.productId },
                data: { stock: { increment: it.quantity } }
              });
            }
          }
        }
      }

      const data: Prisma.ShopOrderUpdateInput = {};
      if (d.status) data.status = d.status;
      if (d.paymentStatus) data.paymentStatus = d.paymentStatus;
      if (d.adminNotes !== undefined) data.adminNotes = d.adminNotes || null;
      return tx.shopOrder.update({ where: { id: order.id }, data, include: { items: true } });
    });
    return NextResponse.json({ order: orderDto(updated) });
  } catch (e) {
    const err = e as { isShop?: boolean; status?: number; message?: string };
    if (err.isShop) return fail(err.message || "تعذر التحديث", err.status || 409);
    return fail("تعذر تحديث الطلب", 500);
  }
}
