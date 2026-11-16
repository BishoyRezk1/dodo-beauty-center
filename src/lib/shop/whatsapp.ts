import type { ShopOrder, ShopOrderItem } from "@prisma/client";
import { money } from "@/lib/shop/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/shop/labels";

export function buildOrderMessage(o: ShopOrder, items: ShopOrderItem[]): string {
  const delivery = Number(o.deliveryFee);
  const lines = items.map((i) => `- ${i.name} × ${i.quantity} = ${money(Number(i.lineTotal))}`);
  return [
    "مرحبًا DoDo Beauty Shop 💗",
    "",
    "أريد تأكيد طلبي:",
    "",
    `رقم الطلب: #${o.orderNo}`,
    "",
    `اسم العميل: ${o.customerName}`,
    `رقم الهاتف: ${o.phone}`,
    `العنوان: ${o.governorate} - ${o.city} - ${o.address}`,
    "",
    "المنتجات:",
    "",
    ...lines,
    "",
    `إجمالي المنتجات: ${money(Number(o.subtotal))}`,
    `التوصيل: ${delivery === 0 ? "مجاني" : money(delivery)}`,
    `طريقة الدفع: ${PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod}`,
    ...(o.transferRef ? [`رقم عملية التحويل: ${o.transferRef}`] : []),
    ...(o.notes ? [`ملاحظات: ${o.notes}`] : []),
    "",
    `الإجمالي النهائي: ${money(Number(o.total))}`,
    "",
    "برجاء تأكيد الطلب وموعد التوصيل."
  ].join("\n");
}
