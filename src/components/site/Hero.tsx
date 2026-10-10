import Link from "next/link";

export default function Hero({ siteName, tagline, whatsappHref }: { siteName: string; tagline: string; whatsappHref: string }) {
  return (
    <section className="relative overflow-hidden">
      {/* Background photo */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/hero-bg.jpg)" }}
      />
      {/* Soft pink veil over the photo so the white/wine text and buttons stay readable */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,245,247,0.55) 0%, rgba(255,245,247,0.85) 55%, rgba(255,245,247,0.97) 100%)"
        }}
      />

      <div className="section-container relative flex flex-col items-center gap-5 py-10 text-center md:gap-8 md:py-28">
        <span className="rounded-full border border-wine/30 bg-white/70 px-4 py-1.5 text-xs font-bold tracking-widest text-wine backdrop-blur-sm">
          BEAUTY · HAIR · SKIN CARE
        </span>
        <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight text-charcoal drop-shadow-sm md:text-6xl">
          جمالك يستحق لمسة راقية
        </h1>
        <p className="max-w-xl text-base text-charcoal/80 md:text-lg">زينا نيلز — جمالك تفصيلة نهتم بيها</p>

        <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link href="/booking" className="btn-primary px-8 py-3.5 text-base">
            احجزي موعدك الآن
          </Link>
          <Link href="/#services" className="btn-secondary bg-white/70 px-8 py-3.5 text-base backdrop-blur-sm">
            اكتشفي خدماتنا
          </Link>
        </div>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm font-bold text-wine underline underline-offset-4">
          أو تواصلي معنا على واتساب
        </a>
      </div>
    </section>
  );
}
