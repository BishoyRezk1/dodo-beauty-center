"use client";

import { useState } from "react";

interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  beforeUrl: string | null;
}

const categoryLabels: Record<string, string> = {
  hair: "تسريحات شعر",
  coloring: "صبغات",
  makeup: "ميكب",
  skincare: "عناية بالبشرة",
  before_after: "قبل وبعد"
};

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setLightbox(item)}
            className="group relative overflow-hidden rounded-xl2 text-right shadow-soft"
          >
            {item.beforeUrl ? (
              <div className="grid grid-cols-2">
                <div
                  className="aspect-square bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.beforeUrl})` }}
                />
                <div
                  className="aspect-square bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
              </div>
            ) : (
              <div
                className="aspect-square bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-3">
              <p className="text-xs font-bold text-white">{item.title}</p>
              <p className="text-[10px] text-white/70">{categoryLabels[item.category] || item.category}</p>
            </div>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-6"
          onClick={() => setLightbox(null)}
        >
          {lightbox.beforeUrl ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="text-center">
                <p className="mb-1 text-xs text-white/60">قبل</p>
                <img src={lightbox.beforeUrl} alt="قبل" className="max-h-[45vh] rounded-xl" />
              </div>
              <div className="text-center">
                <p className="mb-1 text-xs text-white/60">بعد</p>
                <img src={lightbox.imageUrl} alt="بعد" className="max-h-[45vh] rounded-xl" />
              </div>
            </div>
          ) : (
            <img src={lightbox.imageUrl} alt={lightbox.title} className="max-h-[80vh] max-w-full rounded-xl" />
          )}
          <p className="text-sm font-bold text-white">{lightbox.title}</p>
          <button
            onClick={() => setLightbox(null)}
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white"
          >
            إغلاق
          </button>
        </div>
      )}
    </>
  );
}
