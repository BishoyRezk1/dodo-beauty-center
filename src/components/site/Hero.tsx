import Link from "next/link";

const perks = [
  { icon: "📅", title: "حجز أونلاين", text: "احجزي موعدك في دقيقة" },
  { icon: "💬", title: "تواصل سريع", text: "ردّ مباشر على واتساب" },
  { icon: "🎁", title: "عروض دائمة", text: "خصومات وكوبونات" }
];

export default function Hero({ siteName, tagline, whatsappHref }: { siteName: string; tagline: string; whatsappHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/hero-bg.jpg)" }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,245,247,0.45) 0%, rgba(255,245,247,0.82) 50%, rgba(255,245,247,0.98) 100%)"
        }}
      />

      <div aria-hidden="true" data-snow-calm className="pointer-events-none absolute inset-x-[20%] top-[4%] h-[46%] md:inset-x-[34%] md:top-[2%] md:h-[60%]" />

      <div className="section-container relative flex flex-col items-center gap-6 pb-20 pt-12 text-center md:gap-9 md:pb-36 md:pt-28">
        <span className="rounded-full border border-wine/30 bg-white/75 px-5 py-1.5 text-xs font-bold tracking-[0.2em] text-wine shadow-sm backdrop-blur-sm">
          BEAUTY · HAIR · SKIN CARE
        </span>

        <h1 className="max-w-4xl font-display text-4xl font-extrabold leading-[1.25] text-charcoal drop-shadow-sm md:text-7xl">
          جمالك يستحق{" "}
          <span className="bg-gradient-to-l from-wine to-rosegold bg-clip-text text-transparent">لمسة راقية</span>
        </h1>

        <p className="max-w-xl text-base font-semibold text-charcoal/80 md:text-xl">زينا نيلز — جمالك تفصيلة نهتم بيها</p>

        <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link href="/booking" className="btn-primary px-9 py-4 text-base shadow-xl">
            احجزي موعدك الآن
          </Link>
          <Link href="/#services" className="btn-secondary bg-white/75 px-9 py-4 text-base backdrop-blur-sm">
            اكتشفي خدماتنا
          </Link>
        </div>

        <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm font-bold text-wine underline underline-offset-4">
          أو تواصلي معنا على واتساب
        </a>

        <div className="mt-4 grid w-full max-w-3xl grid-cols-3 gap-2.5 md:mt-8 md:gap-5">
          {perks.map((p) => (
            <div key={p.title} className="zn-glass flex flex-col items-center gap-1 px-2 py-3.5 md:gap-2 md:px-5 md:py-6">
              <span className="text-2xl md:text-3xl">{p.icon}</span>
              <span className="text-[13px] font-extrabold text-charcoal md:text-base">{p.title}</span>
              <span className="hidden text-xs text-charcoal/70 sm:block md:text-sm">{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-6 w-full md:h-14">
        <path d="M0,60 L0,30 C240,0 480,0 720,24 C960,48 1200,48 1440,18 L1440,60 Z" fill="#FFF5F7" />
      </svg>
    </section>
  );
}
