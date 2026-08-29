import { prisma } from "@/lib/prisma";
import { formatEGP, formatArabicDate } from "@/lib/utils";
import Link from "next/link";

export default async function OffersSection() {
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { service: true },
    orderBy: { createdAt: "desc" }
  });

  if (offers.length === 0) return null;

  return (
    <section id="offers" className="bg-blush/30 py-16 md:py-24">
      <div className="section-container">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold tracking-widest text-rosegold">عروض خاصة</span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
            عروض لفترة محدودة
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {offers.map((o) => (
            <div key={o.id} className="card flex flex-col gap-3 p-6 md:flex-row md:items-center">
              <div
                className="h-32 w-full shrink-0 rounded-xl bg-gradient-to-br from-rosegold/50 to-wine/40 md:w-32"
                style={o.imageUrl ? { backgroundImage: `url(${o.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              />
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="font-display text-lg font-bold text-charcoal">{o.title}</h3>
                {o.details && <p className="text-sm text-charcoal/60">{o.details}</p>}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-charcoal/40 line-through">{formatEGP(o.oldPrice.toString())}</span>
                  <span className="font-display text-lg font-extrabold text-wine">{formatEGP(o.newPrice.toString())}</span>
                  <span className="text-xs text-charcoal/40">حتى {formatArabicDate(o.endDate)}</span>
                </div>
                <Link
                  href={o.serviceId ? `/booking?service=${o.serviceId}` : "/booking"}
                  className="btn-primary mt-2 w-fit !py-2 text-xs"
                >
                  احجزي العرض
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
