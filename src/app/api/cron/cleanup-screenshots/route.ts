import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedImage } from "@/lib/storage";

/**
 * Deletes Vodafone Cash transfer screenshots once they're no longer needed —
 * keeping customers' payment proof off the site indefinitely isn't
 * necessary once a booking has been reviewed. Runs daily via Vercel Cron
 * (see vercel.json). Only touches bookings that are no longer PENDING
 * (i.e. already reviewed one way or another) and older than RETENTION_DAYS.
 */
const RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: { lt: cutoff },
      screenshotUrl: { not: "" },
      booking: { status: { not: "PENDING" } }
    },
    select: { id: true, screenshotUrl: true }
  });

  let deleted = 0;
  for (const payment of payments) {
    const ok = await deleteUploadedImage(payment.screenshotUrl);
    if (ok) {
      await prisma.payment.update({ where: { id: payment.id }, data: { screenshotUrl: "" } });
      deleted++;
    }
  }

  return NextResponse.json({ ok: true, checked: payments.length, deleted });
}
