import { prisma } from "@/lib/prisma";
import ServiceCard from "./ServiceCard";
import Link from "next/link";

export default async function ServicesSection() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });

  if (services.length === 0) return null;

  return (
    <section id="services" className="section-container py-16 md:py-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">خدماتنا</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          خدمات مصممة لتناسبك
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Link key={s.id} href={`/booking?service=${s.id}`}>
            <ServiceCard
              name={s.name}
              description={s.description}
              price={s.price.toString()}
              discountPrice={s.discountPrice?.toString()}
              durationMin={s.durationMin}
              imageUrl={s.imageUrl}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
