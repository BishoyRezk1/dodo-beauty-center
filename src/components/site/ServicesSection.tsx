import { prisma } from "@/lib/prisma";
import ServiceCard from "./ServiceCard";

export default async function ServicesSection() {
  const services = (await prisma.service.findMany({
    where: {
      isActive: true,
      status: { in: ["AVAILABLE", "COMING_SOON"] }
    },
    orderBy: [
      { category: "asc" },
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  })).filter((s) => Number(s.discountPrice ?? s.price) > 0);

  if (services.length === 0) return null;

  const categoryNames: Record<string, string> = {
    hair: "الشعر",
    "hair-gel": "Hair Gel",
    "hard-gel": "هارد جيل",
    skin: "البشرة",
    makeup: "المكياج",
    nails: "الأظافر",
    "hair-removal": "إزالة الشعر",
    "body-care": "العناية",
    bridal: "العروس",
    general: "خدمات أخرى"
  };

  const grouped = services.reduce<Record<string, typeof services>>(
    (acc, service) => {
      const key = service.category || "general";
      if (!acc[key]) acc[key] = [];
      acc[key].push(service);
      return acc;
    },
    {}
  );

  Object.values(grouped).forEach((categoryServices) => {
    categoryServices.sort((a, b) => {
      const aPrice = Number(a.discountPrice ?? a.price);
      const bPrice = Number(b.discountPrice ?? b.price);
      const aHasPrice = Number.isFinite(aPrice) && aPrice > 0;
      const bHasPrice = Number.isFinite(bPrice) && bPrice > 0;

      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;

      const orderDiff = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
      if (orderDiff !== 0) return orderDiff;

      return a.name.localeCompare(b.name, "ar");
    });
  });

  const entries = Object.entries(grouped);

  return (
    <section id="services" className="section-container py-14 md:py-28">
      <div className="mb-8 text-center md:mb-12">
        <span className="zn-kicker">خدماتنا</span>
        <h2 className="zn-title mt-2">اختاري خدمتك المفضلة</h2>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-l from-wine to-rosegold" />
        <p className="mx-auto mt-4 max-w-xl text-sm text-charcoal/60 md:text-base">
          خدمات احترافية للعناية بالشعر والبشرة والأظافر والمكياج والعروس.
        </p>
      </div>

      {entries.length > 1 && (
        <nav
          aria-label="تصنيفات الخدمات"
          className="-mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:mb-12 md:flex-wrap md:justify-center md:overflow-visible md:px-0"
        >
          {entries.map(([category]) => (
            <a
              key={category}
              href={`#cat-${category}`}
              className="shrink-0 rounded-full border border-wine/25 bg-white/80 px-4 py-2 text-sm font-bold text-wine shadow-sm transition hover:bg-wine hover:text-cream"
            >
              {categoryNames[category] || "خدمات أخرى"}
            </a>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-10 md:gap-16">
        {entries.map(([category, categoryServices]) => (
          <div key={category} id={`cat-${category}`}>
            <div className="mb-5 flex items-center gap-3 md:mb-7">
              <h3 className="font-display text-xl font-extrabold text-charcoal md:text-3xl">
                {categoryNames[category] || "خدمات أخرى"}
              </h3>
              <span className="h-px flex-1 bg-gradient-to-l from-rosegold/40 to-transparent" />
              <span className="rounded-full bg-blush/60 px-3 py-1 text-xs font-bold text-wine">
                {categoryServices.length} خدمة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-[380px]:grid-cols-1 sm:gap-5 md:grid-cols-3 md:gap-7">
              {categoryServices.map((s) => (
                <ServiceCard
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  nameEn={s.nameEn}
                  description={s.description}
                  price={Number(s.price)}
                  discountPrice={s.discountPrice == null ? null : Number(s.discountPrice)}
                  durationMin={s.durationMin}
                  imageUrl={s.imageUrl}
                  status={s.status as "AVAILABLE" | "COMING_SOON" | "HIDDEN"}
                  showComingSoon={Number(s.discountPrice ?? s.price) <= 0}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
