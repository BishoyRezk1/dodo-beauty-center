import { prisma } from "@/lib/prisma";
import { sendPushToCustomer } from "@/lib/push";

export function fmtTime12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}

export function fmtDateAr(d: Date) {
  return d.toLocaleDateString("ar-EG", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

type Note = { title: string; body: string; url: string };

async function send(bookingId: string, build: (when: string, service: string, bn: string) => Note | null) {
  try {
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, bookingNumber: true, date: true, startTime: true, service: { select: { name: true } } }
    });
    if (!b) return;
    const when = `${fmtDateAr(b.date)} الساعة ${fmtTime12(b.startTime)}`;
    const n = build(when, b.service.name, b.bookingNumber);
    if (!n) return;
    await sendPushToCustomer(b.customerId, { ...n, tag: `booking-${bookingId}` });
  } catch {}
}

/** Customer just submitted a booking request. */
export function notifyBookingReceived(bookingId: string) {
  return send(bookingId, (when, s) => ({
    title: "📩 استلمنا طلب حجزك",
    body: `${s} · ${when}. هنأكد معاكي قريب.`,
    url: "/account"
  }));
}

/** Admin changed the booking status. */
export function notifyBookingStatus(bookingId: string, status: string) {
  return send(bookingId, (when, s, bn) => {
    const map: Record<string, Note> = {
      CONFIRMED: { title: "💅🏻 تم تأكيد حجزك في Zina Nails", body: `${s} · ${when}`, url: "/account" },
      REJECTED: { title: "تعذّر تأكيد حجزك", body: `${s} · ${when}. كلمينا في الشات.`, url: "/chat" },
      CANCELLED: { title: "تم إلغاء حجزك", body: `${s} · ${when}`, url: "/chat" },
      COMPLETED: { title: "كيف كانت تجربتك اليوم؟ ⭐", body: "قيّمي تجربتك في Zina Nails", url: `/review?booking=${encodeURIComponent(bn)}` }
    };
    return map[status] || null;
  });
}

/** Admin verified the payment proof. */
export function notifyPaymentVerified(bookingId: string) {
  return send(bookingId, (when, s) => ({
    title: "✅ تم تأكيد الدفع",
    body: `${s} · ${when}`,
    url: "/account"
  }));
}
