"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEGP, formatArabicDate } from "@/lib/utils";

interface Offer {
  id: string;
  title: string;
  details: string | null;
  imageUrl: string | null;
  oldPrice: string;
  newPrice: string;
  endDate: string;
  serviceId: string | null;
}

export default function OffersBanner({ offers }: { offers: Offer[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % offers.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [offers.length]);

  if (offers.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl2 shadow-soft">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      >
        {offers.map((o) => (
          <div key={o.id} className="w-full shrink-0">
            <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden bg-charcoal p-8 text-center md:min-h-[340px] md:p-12">
              <div
                className="absolute inset-0 scale-105 bg-cover bg-center opacity-60 transition-transform duration-[6000ms] ease-out"
                style={{
                  backgroundImage: o.imageUrl
                    ? `url(${o.imageUrl})`
                    : "linear-gradient(135deg, #E91E63, #4A2C35)",
                  transform: index === offers.indexOf(o) ? "scale(1.12)" : "scale(1.0)"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
              <div className="relative animate-[fadeInUp_0.6s_ease-out]">
                <span className="mb-3 inline-block rounded-full bg-wine px-4 py-1 text-xs font-bold text-cream">
                  🎁 عرض لفترة محدودة
                </span>
                <h3 className="mb-2 font-display text-2xl font-extrabold text-white md:text-3xl">
                  {o.title}
                </h3>
                {o.details && <p className="mb-3 text-sm text-white/80">{o.details}</p>}
                <div className="mb-5 flex items-center justify-center gap-3">
                  <span className="text-base text-white/50 line-through">{formatEGP(o.oldPrice)}</span>
                  <span className="font-display text-2xl font-extrabold text-rosegold">
                    {formatEGP(o.newPrice)}
                  </span>
                  <span className="text-xs text-white/60">حتى {formatArabicDate(o.endDate)}</span>
                </div>
                <Link
                  href={o.serviceId ? `/booking?service=${o.serviceId}&offer=${o.id}` : "/booking"}
                  className="btn-primary inline-flex px-8"
                >
                  احجزي العرض الآن
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {offers.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {offers.map((o, i) => (
            <button
              key={o.id}
              onClick={() => setIndex(i)}
              aria-label={`عرض ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-wine" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
