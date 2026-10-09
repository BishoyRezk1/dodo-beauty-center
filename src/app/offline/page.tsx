"use client";

export default function OfflinePage() {
  return (
    <main className="section-container flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="font-display text-2xl font-extrabold text-wine">مفيش اتصال بالإنترنت</h1>
      <p className="max-w-xs text-sm text-charcoal/70">اتأكدي من النت وحاولي تاني. الحجز والشات محتاجين اتصال.</p>
      <button onClick={() => window.location.reload()} className="btn-primary">
        إعادة المحاولة
      </button>
    </main>
  );
}
