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

  // الخدمات ذات السعر تظهر أولاً داخل كل تصنيف، ثم الخدمات بدون سعر.
  // نحافظ على sortOrder داخل كل مجموعة.
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

  return (
    <section
      id="services"
      className="section-container py-16 md:py-24"
    >
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">
          خدماتنا
        </span>

        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          اختاري خدمتك المفضلة
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm text-charcoal/55">
          خدمات احترافية للعناية بالشعر والبشرة والأظافر والمكياج والعروس.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {Object.entries(grouped).map(([category, categoryServices]) => (
          <div key={category}>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h3 className="font-display text-2xl font-extrabold text-charcoal">
                  {categoryNames[category] || "خدمات أخرى"}
                </h3>

                <div className="mt-2 h-1 w-12 rounded-full bg-rosegold" />
              </div>

              <span className="text-xs text-charcoal/40">
                {categoryServices.length} خدمة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-[380px]:grid-cols-1 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-3 lg:gap-6">
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
