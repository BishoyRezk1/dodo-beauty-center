import { prisma } from "@/lib/prisma";

const fallbackReviews = [
  { customerName: "مريم أحمد", rating: 5, comment: "تجربة رائعة وخدمة راقية جدًا، الحجز أونلاين سهّل عليّ كتير.", imageUrl: null as string | null, isFeatured: false },
  { customerName: "سارة محمود", rating: 5, comment: "النتيجة فاقت توقعاتي، وطاقم محترف ومتعاون.", imageUrl: null as string | null, isFeatured: false },
  { customerName: "نور الدين", rating: 5, comment: "مكان نظيف وهادئ، وأسعار مناسبة جدًا لجودة الخدمة.", imageUrl: null as string | null, isFeatured: false }
];

export default async function ReviewsSection() {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 6
  });

  const display = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <section id="reviews" className="section-container py-16 md:py-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">آراء عميلاتنا</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">ثقتكِ سر نجاحنا</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {display.map((r, i) => (
          <div key={i} className={`card overflow-hidden p-6 ${r.isFeatured ? "ring-2 ring-rosegold" : ""}`}>
            {r.imageUrl && (
              <img src={r.imageUrl} alt="صورة من تجربة العميلة" loading="lazy" className="mb-4 h-44 w-full rounded-xl object-cover" />
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-rosegold">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              {r.isFeatured && <span className="rounded-full bg-blush px-2 py-0.5 text-xs font-bold text-wine">⭐ مميّز</span>}
            </div>
            {r.comment && <p className="text-sm text-charcoal/70">"{r.comment}"</p>}
            <p className="mt-4 font-bold text-charcoal">{r.customerName}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <a href="/review" className="btn-secondary inline-block">
          رأيك يهمنا
        </a>
      </div>
    </section>
  );
}
