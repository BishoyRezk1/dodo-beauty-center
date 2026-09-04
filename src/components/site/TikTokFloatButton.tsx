export default function TikTokFloatButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تابعينا على TikTok"
      className="fixed bottom-6 left-40 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-soft transition hover:scale-105"
    >
      <span className="text-2xl font-bold">♪</span>
    </a>
  );
}
