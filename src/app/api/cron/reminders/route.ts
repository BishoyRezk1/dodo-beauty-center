import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, reminderMessage } from "@/lib/whatsapp";
import { sendPushToCustomer } from "@/lib/push";
import { fmtTime12 } from "@/lib/booking-push";

export const dynamic = "force-dynamic";

/**
 * Reminders for CONFIRMED bookings ~24h and ~2h before start (push + WhatsApp).
 * Call it every 15-30 min from an external scheduler (e.g. cron-job.org) with:
 *   Authorization: Bearer <CRON_SECRET>
 * Each reminder is sent once per booking, so extra calls are safe.
 */

// Offset (ms) of Africa/Cairo from UTC at a given instant (handles DST).
function cairoOffsetMs(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((x) => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - at.getTime();
}

// booking.date is stored as midnight UTC of the booking day; startTime is Cairo local.
function startInstant(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const guess = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m);
  return new Date(guess - cairoOffsetMs(new Date(guess)));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || !auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 24 * 3600 * 1000);

  const confirmed = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      date: { gte: dayStart },
      OR: [{ reminder24Sent: false }, { reminder2Sent: false }]
    },
    include: { customer: true, service: true }
  });

  let sent24 = 0;
  let sent2 = 0;

  for (const b of confirmed) {
    const hoursUntil = (startInstant(b.date, b.startTime).getTime() - now.getTime()) / 3600000;

    const window24 = !b.reminder24Sent && hoursUntil <= 25 && hoursUntil >= 23;
    const window2 = !b.reminder2Sent && hoursUntil <= 2.5 && hoursUntil >= 1.5;
    if (!window24 && !window2) continue;

    const hoursBefore = window24 ? 24 : 2;
    const hasPush = (await prisma.pushSubscription.count({ where: { customerId: b.customerId } })) > 0;

    if (hasPush) {
      await sendPushToCustomer(b.customerId, {
        title: "⏰ تذكير بموعدك في Zina Nails",
        body: `${b.service.name} · ${hoursBefore === 24 ? "بكرة" : "بعد ساعتين"} الساعة ${fmtTime12(b.startTime)}`,
        url: "/account",
        tag: `reminder-${b.id}-${hoursBefore}`
      });
    }

    let waOk = false;
    try {
      waOk = await sendWhatsAppMessage(
        b.customer.phone,
        reminderMessage({ serviceName: b.service.name, timeLabel: b.startTime, hoursBefore })
      );
    } catch {}

    if (hasPush || waOk) {
      await prisma.booking.update({
        where: { id: b.id },
        data: window24 ? { reminder24Sent: true } : { reminder2Sent: true }
      });
      if (window24) sent24++;
      else sent2++;
    }
  }

  return NextResponse.json({ ok: true, checked: confirmed.length, sent24, sent2 });
}
