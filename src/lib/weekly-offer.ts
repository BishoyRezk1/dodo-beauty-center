import { prisma } from "@/lib/prisma";

/** Archives only the dedicated weekly-offer service group after its linked offer expires. */
export async function archiveExpiredWeeklyOffer() {
  const now = new Date();
  await prisma.offer.updateMany({
    where: {
      archivedAt: null,
      endDate: { lt: now },
      service: { category: "weekly-offer" }
    },
    data: { archivedAt: now, isActive: false }
  });
  await prisma.service.updateMany({
    where: {
      category: "weekly-offer",
      isActive: true,
      offers: { some: { endDate: { lt: now } } }
    },
    data: { isActive: false, status: "HIDDEN" }
  });
}
