"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const OFFER_DURATION = 7 * 24 * 60 * 60 * 1000;

// يبدأ العد من أول مرة يتم فيها تحميل العرض بعد النشر
const STORAGE_KEY = "zina_nails_opening_offer_start";

const offers = [
  { name: "فتلة", price: 25 },
  { name: "شمع ساخن", price: 25 },
  { name: "شمع بارد", price: 25 },
  { name: "ديرما بلاننج", price: 40 },
  { name: "تنظيف البشرة", price: 100, note: "8 مراحل" },
  { name: "فيك نيبز", price: 100, note: "لون واحد" },
  { name: "سوفت جيل", price: 130, note: "لون واحد" },
  { name: "ترتمنت", price: 120, note: "لون واحد" },
  { name: "جيل بولش", price: 80 },
  { name: "هارد جيل", price: 200, note: "فقط" },
  { name: "مكواة شعر", price: 100, note: "شعر طويل" },
  { name: "مكواة شعر", price: 70, note: "شعر قصير" },
];

export default function OpeningOffer() {
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    let startedAt = localStorage.getItem(STORAGE_KEY);

    if (!startedAt) {
      startedAt = String(Date.now());
      localStorage.setItem(STORAGE_KEY, startedAt);
    }

    const start = Number(startedAt);

    const update = () => {
      const left = start + OFFER_DURATION - Date.now();

      if (left <= 0) {
        setVisible(false);
        setRemaining("");
        return;
      }

      const days = Math.floor(left / 86400000);
      const hours = Math.floor((left % 86400000) / 3600000);
      const minutes = Math.floor((left % 3600000) / 60000);

      setRemaining(`${days} يوم • ${hours} ساعة • ${minutes} دقيقة`);
      setVisible(true);
    };

    update();

    const timer = window.setInterval(update, 60000);

    return () => window.clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <section
      id="opening-offer"
      className="section-container py-12 md:py-20"
      dir="rtl"
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-soft ring-1 ring-rosegold/30 md:p-10">

        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rosegold/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-wine/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl">

          <div className="text-center">
            <span className="inline-flex rounded-full bg-wine px-5 py-2 text-xs font-bold text-cream">
              🎀 بمناسبة الافتتاح 🎀
            </span>

            <div className="mt-5 flex justify-center">
              <img
                src="/logo-watermark.png"
                alt="Zina Nails"
                className="h-24 w-auto object-contain md:h-32"
              />
            </div>

            <h2 className="mt-3 font-display text-3xl font-extrabold text-charcoal md:text-5xl">
              عروض الافتتاح
            </h2>

            <p className="mt-3 text-sm font-semibold text-wine md:text-base">
              أسعار خاصة لمدة أسبوع فقط
            </p>

            <div className="mx-auto mt-4 inline-flex rounded-full bg-white px-5 py-2 text-xs font-bold text-charcoal shadow-sm ring-1 ring-rosegold/20">
              ⏳ متبقي: {remaining}
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer, index) => (
              <div
                key={`${offer.name}-${offer.note ?? ""}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-rosegold/20 bg-white/90 px-4 py-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-charcoal">
                    {offer.name}
                  </h3>

                  {offer.note && (
                    <p className="mt-1 text-xs text-charcoal/60">
                      {offer.note}
                    </p>
                  )}
                </div>

                <span className="shrink-0 rounded-xl bg-wine px-3 py-2 text-sm font-extrabold text-white">
                  {offer.price} جنيه
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/booking"
              className="btn-primary inline-flex px-10"
            >
              احجزي الآن ✨
            </Link>

            <p className="mt-4 text-sm font-semibold text-wine">
              Zina Nails
            </p>

            <p className="mt-1 text-xs text-charcoal/60">
              العرض لفترة محدودة بمناسبة الافتتاح
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
