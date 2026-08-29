interface Props {
  siteName: string;
  whatsappHref: string;
}

export default function Footer({ siteName, whatsappHref }: Props) {
  return (
    <footer className="border-t border-rosegold/25 bg-charcoal py-10 text-cream">
      <div className="section-container flex flex-col items-center gap-4 text-center">
        <p className="font-display text-lg font-bold">{siteName}</p>
        <p className="text-sm text-cream/60">السبت – الخميس · 10:00 ص – 10:00 م</p>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm font-bold text-rosegold hover:underline">
          تواصلي معنا على واتساب
        </a>
        <p className="mt-4 text-xs text-cream/40">بشوي رزق © 2025 — جميع الحقوق محفوظة</p>
      </div>
    </footer>
  );
}
