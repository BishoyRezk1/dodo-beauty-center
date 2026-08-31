import Link from "next/link";

export default function Hero({ siteName, tagline, whatsappHref }: { siteName: string; tagline: string; whatsappHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 100% at 100% 0%, #FFD9E8 0%, #FFF5F7 45%, #FFF5F7 100%)"
        }}
      />
      {/* Signature element: an arc of soft dots evoking a strand of pearls / hair curl */}
      <svg
        className="pointer-events-none absolute -left-24 top-10 hidden h-[420px] w-[420px] opacity-70 md:block"
        viewBox="0 0 400 400"
        fill="none"
      >
        <path
          d="M 380 20 C 380 220 220 380 20 380"
          stroke="#E85588"
          strokeWidth="1.5"
          strokeDasharray="1 14"
          strokeLinecap="round"
        />
        <path
          d="M 340 20 C 340 190 190 340 20 340"
          stroke="#E91E63"
          strokeWidth="1"
          strokeDasharray="1 10"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      <div className="section-container relative flex flex-col items-center gap-8 py-20 text-center md:py-28">
        <span className="rounded-full border border-wine/30 bg-white/60 px-4 py-1.5 text-xs font-bold tracking-widest text-wine">
          BEAUTY · HAIR · SKIN CARE
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-charcoal md:text-6xl">
          {siteName}
        </h1>
        <p className="max-w-xl text-lg text-charcoal/70">{tagline}</p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/booking" className="btn-primary px-8 py-4 text-base">
            احجزي موعدك الآن
          </Link>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-secondary px-8 py-4 text-base">
            تواصلي معنا على واتساب
          </a>
        </div>
      </div>
    </section>
  );
}
