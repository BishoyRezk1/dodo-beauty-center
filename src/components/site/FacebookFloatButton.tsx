export default function FacebookFloatButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تابعينا على Facebook"
      className="fixed bottom-6 left-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-soft transition hover:scale-105"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 fill-current"
        aria-hidden="true"
      >
        <path d="M13.5 21v-8h2.75l.41-3h-3.16V8.08c0-.87.24-1.46 1.5-1.46h1.8V3.94c-.31-.04-1.37-.14-2.61-.14-2.58 0-4.35 1.58-4.35 4.48V10H7v3h2.84v8h3.66Z" />
      </svg>
    </a>
  );
}
