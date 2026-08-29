const reviews = [
  { name: "مريم أحمد", text: "تجربة رائعة وخدمة راقية جدًا، الحجز أونلاين سهّل عليّ كتير.", rating: 5 },
  { name: "سارة محمود", text: "النتيجة فاقت توقعاتي، وطاقم محترف ومتعاون.", rating: 5 },
  { name: "نور الدين", text: "مكان نظيف وهادئ، وأسعار مناسبة جدًا لجودة الخدمة.", rating: 5 }
];

export default function ReviewsSection() {
  return (
    <section id="reviews" className="section-container py-16 md:py-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-rosegold">آراء عميلاتنا</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
          ثقتكِ سر نجاحنا
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {reviews.map((r, i) => (
          <div key={i} className="card p-6">
            <div className="mb-3 text-rosegold">{"★".repeat(r.rating)}</div>
            <p className="text-sm text-charcoal/70">"{r.text}"</p>
            <p className="mt-4 font-bold text-charcoal">{r.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
