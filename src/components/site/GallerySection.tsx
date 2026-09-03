import { prisma } from "@/lib/prisma";
import GalleryGrid from "./GalleryGrid";

export default async function GallerySection() {
  const items = await prisma.galleryItem.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 9
  });

  if (items.length === 0) return null;

  return (
    <section id="gallery" className="section-container py-16 md:py-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">معرض أعمالنا</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          شاهدي أحدث أعمالنا
        </h2>
      </div>
      <GalleryGrid items={items} />
    </section>
  );
}
