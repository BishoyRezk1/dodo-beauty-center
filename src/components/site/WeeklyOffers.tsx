import Link from "next/link";
import type { WeeklyOffer } from "@/lib/weekly-cards";

const num = (v: string | number) => Number(v).toLocaleString("ar-EG");
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long", timeZone: "Africa/Cairo" });

function priceText(o: WeeklyOffer) {
  const max = o.priceMax ? Number(o.priceMax) : 0;
  return max > Number(o.newPrice) ? `${num(o.newPrice)} – ${num(max)}` : num(o.newPrice);
}

export default function WeeklyOffers({ offers }: { offers: WeeklyOffer[] }) {
  if (offers.length === 0) return null;
  const start = offers.reduce((m, o) => (o.startDate < m ? o.startDate : m), offers[0].startDate);
  const end = offers.reduce((m, o) => (o.endDate > m ? o.endDate : m), offers[0].endDate);
  const daysLeft = Math.max(1, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));

  return (
    <section
      id="weekly-offer"
      className="relative overflow-hidden bg-gradient-to-b from-cream via-blush/40 to-cream py-14 md:py-20"
    >
      <div className="section-container">
        <div className="mb-10 text-center">
          <img
            src="/icons/icon-192.png"
            alt="Zena Nails"
            width={64}
            height={64}
            className="mx-auto mb-4 h-16 w-16 rounded-full border-2 border-rosegold/40 object-cover shadow-soft"
          />
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-fuchsia-600 to-wine px-5 py-1.5 text-xs font-extrabold tracking-wide text-white shadow-soft">
            💖 عرض الأسبوع
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
            عرض الأسبوع
          </h2>
          <p className="mt-2 text-sm font-bold text-fuchsia-700 md:text-base">
            أسعار خاصة لمدة 7 أيام فقط
          </p>
          <p className="mt-1 text-xs text-charcoal/60">
            من {day(start)} حتى {day(end)} · {daysLeft === 1 ? "آخر يوم!" : `باقي ${num(daysLeft)} أيام`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => {
            return (
              <article
                key={o.id}
                className="group flex flex-col overflow-hidden rounded-xl2 border border-rosegold/20 bg-white shadow-soft transition hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-blush to-rosegold/40">
                  {o.imageUrl && (
                    <img
                      src={o.imageUrl}
                      alt={o.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-gradient-to-l from-fuchsia-600 to-wine px-3 py-1 text-[11px] font-extrabold text-white shadow-soft">
                    💖 عرض الأسبوع
                  </span>
                  <div className="absolute bottom-3 left-3 rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-soft">
                    <div className="font-display text-2xl font-extrabold leading-none text-fuchsia-600">
                      {priceText(o)}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-charcoal/60">جنيه</div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-display text-lg font-extrabold text-charcoal">{o.title}</h3>
                  {o.details && o.details.length > o.title.length + 15 && (
                    <p className="text-sm text-charcoal/60">{o.details}</p>
                  )}
                  <Link
                    href={`/booking?service=${o.serviceId}&offer=${o.id}`}
                    className="btn-primary mt-auto w-full !bg-gradient-to-l !from-fuchsia-600 !to-wine"
                  >
                    احجزي الآن
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
