import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/customers
// قاعدة العملاء — البيانات الأساسية + آخر معاملة + آخر خدمة + إجمالي المدفوع
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const customers = await prisma.customer.findMany({
    include: {
      bookings: {
        orderBy: [
          { date: "desc" },
          { createdAt: "desc" }
        ],
        include: {
          service: true,
          payment: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const rows = customers.map((c) => {
    const completedBookings = c.bookings.filter(
      (b) => b.status === "COMPLETED"
    );

    const latestTransaction =
      completedBookings[0] ?? c.bookings[0] ?? null;

    const totalPaid = c.bookings
      .filter((b) => b.payment?.verified)
      .reduce(
        (sum, b) => sum + Number(b.payment!.amount),
        0
      );

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      notes: c.notes,
      isBlocked: c.isBlocked,

      bookingsCount: c.bookings.length,

      lastBooking: c.bookings[0]?.date ?? null,

      lastTransactionAt:
        c.lastTransactionAt ??
        latestTransaction?.date ??
        null,

      lastService:
        latestTransaction?.service?.name ??
        null,

      totalPaid,

      bookings: c.bookings.map((b) => ({
        bookingNumber: b.bookingNumber,
        service: b.service.name,
        date: b.date,
        status: b.status
      }))
    };
  });

  return NextResponse.json(rows);
}
