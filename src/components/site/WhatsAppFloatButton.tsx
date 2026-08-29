export default function WhatsAppFloatButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصلي معنا على واتساب"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-soft transition hover:scale-105"
    >
      💬
    </a>
  );
}
