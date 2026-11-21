"use client";

import { useState } from "react";
import SafeImage from "@/components/SafeImage";

export default function WeeklyCardImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return <div className="flex h-full w-full items-center justify-center text-5xl">💅</div>;
  }
  return (
    <SafeImage
      src={src as string}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      onError={() => setFailed(true)}
      className="object-cover transition duration-500 group-hover:scale-105"
    />
  );
}
