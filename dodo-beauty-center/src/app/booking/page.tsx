import { Suspense } from "react";
import Link from "next/link";
import BookingFlow from "./BookingFlow";

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="section-container flex h-16 items-center">
        <Link href="/" className="font-display text-lg font-extrabold text-wine">
          ← الرئيسية
        </Link>
      </div>
      <Suspense fallback={<div className="section-container py-16 text-center text-charcoal/50">جاري التحميل...</div>}>
        <BookingFlow />
      </Suspense>
    </div>
  );
}
