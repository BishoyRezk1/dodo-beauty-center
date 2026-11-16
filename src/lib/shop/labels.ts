export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "الدفع عند الاستلام",
  VODAFONE_CASH: "فودافون كاش"
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "جديد",
  AWAITING_CONFIRMATION: "بانتظار تأكيد العميل",
  CONFIRMED: "تم التأكيد",
  PREPARING: "جاري التجهيز",
  OUT_FOR_DELIVERY: "خرج للتوصيل",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي"
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "غير مدفوع",
  PENDING_REVIEW: "بانتظار مراجعة التحويل",
  PAID: "مدفوع",
  REFUNDED: "مسترد"
};
