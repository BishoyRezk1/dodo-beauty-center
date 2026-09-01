import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, reminderMessage } from "@/lib/whatsapp";

/**
 * Sends WhatsApp reminders for confirmed bookings starting in ~24h or ~2h.
 *
 * Vercel's own cron (see vercel.json) calls this automatically once a day,
 * which is enough for the 24h reminder but too coarse for the 2h one.
 * Vercel authenticates its own cron calls with an
 * `Authorization: Bearer $CRON_SECRET` header automatically — just set
 * CRON_SECRET as an environment variable and nothing else is needed.
 *
 * For the 2h reminder to actually fire on time, add a free external
 * scheduler (e.g. cron-job.org) that calls this URL every 15–30 minutes
 * with the same header:
 *
 *   GET https://yourdomain.com/api/cron/reminders
 *   Header: Authorization: Bearer YOUR_CRON_SECRET
 *
 * Both reminders are idempotent (each booking is only reminded once per
 * window) so calling this endpoint extra times is always safe.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const now = new Date();
  const confirmed = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      date: { gte: new Date(now.toDateString()) },
      OR: [{ reminder24Sent: false }, { reminder2Sent: false }]
    },
    include: { customer: true, service: true }
  });

  let sent24 = 0;
  let sent2 = 0;

  for (const booking of confirmed) {
    const [h, m] = booking.startTime.split(":").map(Number);
    const start = new Date(booking.date);
    start.setHours(h, m, 0, 0);
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 24h window: 23–25 hours out, not sent yet
    if (!booking.reminder24Sent && hoursUntil <= 25 && hoursUntil >= 23) {
      const message = reminderMessage({
        serviceName: booking.service.name,
        timeLabel: booking.startTime,
        hoursBefore: 24
      });
      const ok = await sendWhatsAppMessage(booking.customer.phone, message);
      if (ok) {
        await prisma.booking.update({ where: { id: booking.id }, data: { reminder24Sent: true } });
        sent24++;
      }
    }

    // 2h window: 1.5–2.5 hours out, not sent yet
    if (!booking.reminder2Sent && hoursUntil <= 2.5 && hoursUntil >= 1.5) {
      const message = reminderMessage({
        serviceName: booking.service.name,
        timeLabel: booking.startTime,
        hoursBefore: 2
      });
      const ok = await sendWhatsAppMessage(booking.customer.phone, message);
      if (ok) {
        await prisma.booking.update({ where: { id: booking.id }, data: { reminder2Sent: true } });
        sent2++;
      }
    }
  }

  return NextResponse.json({ ok: true, checked: confirmed.length, sent24, sent2 });
}
