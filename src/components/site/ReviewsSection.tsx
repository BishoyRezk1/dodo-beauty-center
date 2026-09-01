import { prisma } from "@/lib/prisma";

const fallbackReviews = [
  { customerName: "مريم أحمد", rating: 5, comment: "تجربة رائعة وخدمة راقية جدًا، الحجز أونلاين سهّل عليّ كتير." },
  { customerName: "سارة محمود", rating: 5, comment: "النتيجة فاقت توقعاتي، وطاقم محترف ومتعاون." },
  { customerName: "نور الدين", rating: 5, comment: "مكان نظيف وهادئ، وأسعار مناسبة جدًا لجودة الخدمة." }
];

export default async function ReviewsSection() {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 6
  });

  const display = reviews.length > 0 ? reviews : fallbackReviews;

  return (
    <section id="reviews" className="section-container py-16 md:py-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">آراء عميلاتنا</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          ثقتكِ سر نجاحنا
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {display.map((r, i) => (
          <div key={i} className="card p-6">
            <div className="mb-3 text-rosegold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            {r.comment && <p className="text-sm text-charcoal/70">"{r.comment}"</p>}
            <p className="mt-4 font-bold text-charcoal">{r.customerName}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
