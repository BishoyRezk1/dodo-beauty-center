/**
 * WhatsApp integration layer.
 *
 * Two modes, chosen automatically based on which environment variables are set:
 *
 * 1. WhatsApp Business Cloud API (production): set WHATSAPP_PHONE_NUMBER_ID
 *    and WHATSAPP_ACCESS_TOKEN. Messages are sent server-to-server via the
 *    Graph API — no user interaction needed.
 *
 * 2. wa.me link fallback (works with zero setup): builds a
 *    "https://wa.me/<number>?text=<message>" link that opens WhatsApp with a
 *    pre-filled message. Used for the admin's "Send via WhatsApp" button and
 *    as a fallback if the Cloud API call fails or isn't configured.
 *
 * IMPORTANT: no real phone numbers, tokens, or account IDs are hard-coded
 * here. Everything comes from environment variables / the Settings table so
 * this file is safe to commit to a public repo.
 */

const GRAPH_API_VERSION = "v20.0";

interface CloudApiConfig {
  phoneNumberId: string;
  accessToken: string;
}

function getCloudApiConfig(): CloudApiConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Attempts to send via the Cloud API. Returns true on success. If the API
 * isn't configured, returns false so the caller can fall back to a wa.me
 * link shown in the admin UI instead.
 */
export async function sendWhatsAppMessage(toPhone: string, message: string): Promise<boolean> {
  const config = getCloudApiConfig();
  if (!config) return false;

  try {
    const cleanPhone = toPhone.replace(/[^0-9]/g, "");
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message }
        })
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function newBookingAdminMessage(params: {
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  feeAmount: number;
}) {
  return `🔔 حجز جديد — DoDo Beauty Center

رقم الحجز: ${params.bookingNumber}
الاسم: ${params.customerName}
الهاتف: ${params.customerPhone}
الخدمة: ${params.serviceName}
التاريخ: ${params.dateLabel}
الوقت: ${params.timeLabel}
رسوم الحجز: ${params.feeAmount} جنيه
حالة الدفع: في انتظار المراجعة`;
}

export function bookingConfirmedCustomerMessage(params: {
  bookingNumber: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
}) {
  return `❤️ DoDo Beauty Center
تم تأكيد حجزك بنجاح.

رقم الحجز: ${params.bookingNumber}
الخدمة: ${params.serviceName}
التاريخ: ${params.dateLabel}
الوقت: ${params.timeLabel}

نتشرف بزيارتك 🌷`;
}

export function bookingRejectedCustomerMessage(params: { bookingNumber: string }) {
  return `DoDo Beauty Center

نأسف، لم نتمكن من تأكيد حجزك رقم ${params.bookingNumber} — يرجى التواصل معنا على واتساب لمراجعة عملية الدفع.`;
}

export function bookingCancelledCustomerMessage(params: { bookingNumber: string }) {
  return `DoDo Beauty Center

تم إلغاء حجزك رقم ${params.bookingNumber}. لو حابة تحجزي موعد تاني، إحنا في انتظارك 🌷`;
}

export function bookingRescheduledCustomerMessage(params: {
  bookingNumber: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
}) {
  return `DoDo Beauty Center

تم تعديل موعد حجزك رقم ${params.bookingNumber}.

الخدمة: ${params.serviceName}
الموعد الجديد: ${params.dateLabel} — ${params.timeLabel}

في انتظارك 💕`;
}

export function reminderMessage(params: {
  serviceName: string;
  timeLabel: string;
  hoursBefore: 24 | 2;
}) {
  const when = params.hoursBefore === 24 ? "بكرة" : "بعد ساعتين";
  return `💕 تذكير من DoDo Beauty Center

معاكِ موعد ${when} الساعة ${params.timeLabel} لخدمة ${params.serviceName}.
في انتظارك 🌷`;
}

export function reviewRequestMessage(params: { bookingNumber: string; reviewUrl: string }) {
  return `DoDo Beauty Center 💕

نتمنى تكوني استمتعتي بزيارتك! نسعد لو قيّمتي تجربتك:
${params.reviewUrl}

(رقم الحجز: ${params.bookingNumber})`;
}
