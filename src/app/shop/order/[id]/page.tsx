import Link from "next/link";
import { notFound } from "next/navigation";
import ShopHeader from "@/components/shop/ShopHeader";
import OrderActions from "@/components/shop/OrderActions";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/shop/settings";
import { buildOrderMessage } from "@/lib/shop/whatsapp";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { money } from "@/lib/shop/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/shop/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "طلبك | DoDo Beauty Shop", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: { id: string } }) {
  if (!params.id || params.id.length > 40) notFound();

  let order = null;
  let failed = false;
  try {
    order = await prisma.shopOrder.findUnique({ where: { id: params.id }, include: { items: true } });
  } catch {
    failed = true;
  }
  if (failed) {
    return (
      <div dir="rtl" className="min-h-screen">
        <ShopHeader backHref="/shop" />
        <p className="m-6 rounded-xl bg-cream p-6 text-center">تعذر تحميل الطلب الآن، جرّبي بعد قليل.</p>
      </div>
    );
  }
  if (!order) notFound();

  const settings = await getShopSettings().catch(() => null);
  const text = buildOrderMessage(order, order.items);
  const waHref = settings?.whatsapp ? buildWhatsAppLink(settings.whatsapp, text) : null;
  const delivery = Number(order.deliveryFee);
  const showTransfer = order.paymentMethod === "VODAFONE_CASH" && order.paymentStatus !== "PAID";

  return (
    <div dir="rtl" className="min-h-screen pb-24">
      <ShopHeader backHref="/shop" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-4">
        <div className="rounded-2xl bg-cream p-5 text-center">
          <p className="text-lg font-bold text-wine">تم حفظ طلبك ✓</p>
          <p className="mt-1 text-2xl font-bold">رقم الطلب: #{String(order.orderNo)}</p>
          <p className="mt-2 text-sm text-charcoal/80">
            الطلب لسه <strong>بانتظار تأكيدك</strong>. اضغطي على زر واتساب لإرسال التفاصيل وتأكيد موعد التوصيل.
          </p>
        </div>

        <OrderActions href={waHref} text={text} />
        {!waHref && <p className="text-center text-sm text-wine">تعذر تحميل رقم واتساب، انسخي التفاصيل وابعتيها لنا. رقم طلبك #{String(order.orderNo)}</p>}

        {showTransfer && settings && (
          <div className="rounded-2xl border border-rosegold/25 bg-white p-4 text-sm shadow-soft">
            <p className="font-bold text-wine">تعليمات فودافون كاش</p>
            {settings.vodafoneNumber && (
              <p className="mt-1">
                الرقم: <strong dir="ltr">{settings.vodafoneNumber}</strong>
              </p>
            )}
            <p className="mt-1 whitespace-pre-line text-charcoal/80">{settings.paymentInstructions}</p>
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-rosegold/25 bg-white p-4 shadow-soft">
          <div className="flex justify-between text-sm">
            <span>حالة الطلب</span>
            <span className="font-bold">{ORDER_STATUS_LABEL[order.status] || order.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>الدفع</span>
            <span className="font-bold">
              {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod} · {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
            </span>
          </div>
          <div className="border-t border-rosegold/25 pt-2">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between py-0.5 text-sm">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span className="font-bold">{money(Number(i.lineTotal))}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-rosegold/25 pt-2 text-sm">
            <span>إجمالي المنتجات</span>
            <span className="font-bold">{money(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>التوصيل</span>
            <span className="font-bold">{delivery === 0 ? "مجاني" : money(delivery)}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-bold">الإجمالي</span>
            <span className="font-bold text-wine">{money(Number(order.total))}</span>
          </div>
        </div>

        <Link href="/shop" className="block text-center font-bold text-wine underline">
          متابعة التسوق
        </Link>
      </main>
    </div>
  );
}
