import type { ShopOrder, ShopOrderItem } from "@prisma/client";

export const ORDER_STATUSES = ["NEW", "AWAITING_CONFIRMATION", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PENDING_REVIEW", "PAID", "REFUNDED"] as const;

export function orderDto(o: ShopOrder & { items: ShopOrderItem[] }) {
  return {
    id: o.id,
    orderNo: Number(o.orderNo),
    customerName: o.customerName,
    phone: o.phone,
    whatsapp: o.whatsapp,
    governorate: o.governorate,
    city: o.city,
    address: o.address,
    notes: o.notes,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    transferRef: o.transferRef,
    receiptUrl: o.receiptUrl,
    subtotal: Number(o.subtotal),
    discountTotal: Number(o.discountTotal),
    deliveryFee: Number(o.deliveryFee),
    total: Number(o.total),
    adminNotes: o.adminNotes,
    stockRestored: o.stockRestored,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal)
    }))
  };
}
