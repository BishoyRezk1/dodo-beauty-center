interface Props {
  siteName: string;
  whatsappHref: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

export default function Footer({ siteName, whatsappHref, instagramUrl, facebookUrl, tiktokUrl }: Props) {
  const socials = [
    { url: instagramUrl, label: "Instagram", icon: "📷" },
    { url: facebookUrl, label: "Facebook", icon: "f" },
    { url: tiktokUrl, label: "TikTok", icon: "🎵" }
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-rosegold/25 bg-charcoal py-10 text-cream">
      <div className="section-container flex flex-col items-center gap-4 text-center">
        <p className="font-display text-lg font-bold">{siteName}</p>
        <p className="text-sm text-cream/60">السبت – الخميس · 10:00 ص – 10:00 م</p>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm font-bold text-rosegold hover:underline">
          تواصلي معنا على واتساب
        </a>
        {socials.length > 0 && (
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-xl font-bold text-white opacity-90 transition hover:scale-105 hover:opacity-100"
              >
                {s.icon}
              </a>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-cream/40">بشوي رزق © 2025 — جميع الحقوق محفوظة</p>
      </div>
    </footer>
  );
}
