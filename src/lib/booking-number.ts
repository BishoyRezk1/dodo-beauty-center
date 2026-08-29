import { prisma } from "@/lib/prisma";

/**
 * Generates sequential, human-friendly booking numbers like DODO-2026-00125.
 * Uses a DB count per-year rather than a separate counter table, wrapped in
 * a retry loop to stay safe under light concurrency.
 */
export async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DODO-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.booking.count({
      where: { bookingNumber: { startsWith: prefix } }
    });
    const candidate = `${prefix}${String(count + 1 + attempt).padStart(5, "0")}`;
    const exists = await prisma.booking.findUnique({ where: { bookingNumber: candidate } });
    if (!exists) return candidate;
  }
  // Extremely unlikely fallback
  return `${prefix}${Date.now()}`;
}
