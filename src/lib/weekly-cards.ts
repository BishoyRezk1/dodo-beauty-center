import { prisma } from "@/lib/prisma";

export interface WeeklyOffer {
  id: string;
  title: string;
  details: string | null;
  imageUrl: string | null;
  newPrice: string;
  priceMax: string | null;
  startDate: string;
  endDate: string;
  serviceId: string;
}

// صور من مجلد public/images/services (الموجودة فعلًا في المشروع)
const IMAGES: Record<string, string> = {
  "weekly-flat-iron-2026": "/images/services/hidden-hair-blow-dry.jpg",
  "weekly-trim-wash-2026": "/images/services/hidden-hair-haircut.jpg",
  "weekly-facial-cleaning-2026": "/images/services/available-facial-cleaning.jpg",
  "weekly-deep-facial-2026": "/images/services/hidden-skin-wax-deep-facial-cleaning.jpg",
  "weekly-light-hard-gel-2026": "/images/services/hidden-nails-feet-hard-gel-strengthening.jpg",
  "weekly-face-brows-derma-mask-2026": "/images/services/coming-soon-face-mask.jpg",
  "weekly-foot-pedicure-2026": "/images/services/hidden-nails-feet-foot-pedicure.jpg",
  "weekly-fake-nails-one-color-2026": "/images/services/available-fake-nails.jpg",
  "weekly-gel-polish-one-color-2026": "/images/services/available-gel-polish.jpg"
};

/** عروض الأسبوع الفعّالة الآن فقط: داخل المدة، غير مؤرشفة، وخدمتها متاحة. */
export async function getWeeklyOffers(): Promise<WeeklyOffer[]> {
  const now = new Date();
  const rows = await prisma.offer.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
      service: { is: { category: "weekly-offer", isActive: true, status: "AVAILABLE" } }
    },
    include: { service: true },
    orderBy: [{ service: { sortOrder: "asc" } }, { createdAt: "asc" }]
  });
  return rows.map((o) => {
    const max = Number(o.oldPrice);
    return {
      id: o.id,
      title: o.title,
      details: o.details,
      imageUrl: o.imageUrl || o.service?.imageUrl || (o.service ? IMAGES[o.service.slug] : null) || null,
      newPrice: o.newPrice.toString(),
      priceMax: max > Number(o.newPrice) ? String(max) : null,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString(),
      serviceId: o.serviceId as string
    };
  });
}
