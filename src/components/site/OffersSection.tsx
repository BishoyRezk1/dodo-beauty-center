import { prisma } from "@/lib/prisma";
import OffersBanner from "./OffersBanner";

export default async function OffersSection() {
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { createdAt: "desc" }
  });

  if (offers.length === 0) return null;

  const serialized = offers.map((o) => ({
    id: o.id,
    title: o.title,
    details: o.details,
    imageUrl: o.imageUrl,
    oldPrice: o.oldPrice.toString(),
    newPrice: o.newPrice.toString(),
    endDate: o.endDate.toISOString(),
    serviceId: o.serviceId
  }));

  return (
    <section id="offers" className="section-container relative py-16 md:py-24">
      <span aria-hidden="true" className="winter-deco pointer-events-none absolute right-3 top-3 select-none text-3xl text-rosegold/25">❄</span>
      <span aria-hidden="true" className="winter-deco pointer-events-none absolute left-4 top-16 select-none text-xl text-rosegold/20">❅</span>
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">عروض خاصة</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          عروض لفترة محدودة
        </h2>
      </div>
      <OffersBanner offers={serialized} />
    </section>
  );
}
