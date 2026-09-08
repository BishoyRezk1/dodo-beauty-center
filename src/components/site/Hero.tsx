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

      <div className="section-container relative flex flex-col items-center gap-8 py-20 text-center md:py-28">
        <span className="rounded-full border border-wine/30 bg-white/70 px-4 py-1.5 text-xs font-bold tracking-widest text-wine backdrop-blur-sm">
          BEAUTY · HAIR · SKIN CARE
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-charcoal drop-shadow-sm md:text-6xl">
          {siteName}
        </h1>
        <p className="max-w-xl text-lg text-charcoal/80">{tagline}</p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/booking" className="btn-primary px-8 py-4 text-base">
            احجزي موعدك الآن
          </Link>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-secondary bg-white/70 px-8 py-4 text-base backdrop-blur-sm">
            تواصلي معنا على واتساب
          </a>
        </div>
      </div>
    </section>
  );
}
