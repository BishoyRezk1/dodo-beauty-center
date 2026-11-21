"use client";
import SafeImage from "@/components/SafeImage";

import { useState } from "react";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-2xl bg-cream text-6xl">💗</div>;
  }
  const go = (d: number) => setIdx((i) => (i + d + images.length) % images.length);
  const arrow =
    "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-wine shadow-soft";
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-rosegold/20 bg-white">
        <SafeImage src={images[idx]} alt={name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain p-2" priority />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="السابق" onClick={() => go(-1)} className={`${arrow} right-2`}>
              ›
            </button>
            <button type="button" aria-label="التالي" onClick={() => go(1)} className={`${arrow} left-2`}>
              ‹
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-charcoal/60 px-3 py-0.5 text-xs font-bold text-cream">
              {idx + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`صورة ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${i === idx ? "border-wine" : "border-rosegold/20"}`}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
