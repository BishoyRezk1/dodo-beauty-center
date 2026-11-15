"use client";

import { useState } from "react";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-2xl bg-cream text-6xl">💗</div>;
  }
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl border border-rosegold/25 bg-cream">
        <img src={images[idx]} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`صورة ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === idx ? "border-wine" : "border-transparent"}`}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
