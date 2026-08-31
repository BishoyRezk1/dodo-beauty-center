import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

// GET /api/customers — admin: customer list with booking counts, last visit,
// and total verified payments — built from Booking/Payment rather than the
// denormalized Customer.totalPaid so it's always accurate.
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const customers = await prisma.customer.findMany({
    include: {
      bookings: {
        orderBy: { date: "desc" },
        include: { service: true, payment: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = customers.map((c) => {
    const totalPaid = c.bookings
      .filter((b) => b.payment?.verified)
      .reduce((sum, b) => sum + Number(b.payment!.amount), 0);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      bookingsCount: c.bookings.length,
      lastBooking: c.bookings[0]?.date ?? null,
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
