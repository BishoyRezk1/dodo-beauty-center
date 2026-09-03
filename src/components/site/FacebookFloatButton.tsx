export default function FacebookFloatButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تابعينا على Facebook"
      className="fixed bottom-6 left-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-3xl font-bold text-white shadow-soft transition hover:scale-105"
    >
      f
    </a>
  );
}
