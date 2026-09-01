import { prisma } from "@/lib/prisma";

const categoryLabels: Record<string, string> = {
  hair: "تسريحات شعر",
  coloring: "صبغات",
  makeup: "ميكب",
  skincare: "عناية بالبشرة",
  before_after: "قبل وبعد"
};

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-xl2 shadow-soft">
            {item.beforeUrl ? (
              <div className="grid grid-cols-2">
                <div
                  className="aspect-square bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.beforeUrl})` }}
                />
                <div
                  className="aspect-square bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
              </div>
            ) : (
              <div
                className="aspect-square bg-cover bg-center"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-3">
              <p className="text-xs font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-white/70">{categoryLabels[item.category] || item.category}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
