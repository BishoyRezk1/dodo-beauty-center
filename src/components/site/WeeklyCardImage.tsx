"use client";

import { useState } from "react";

export default function WeeklyCardImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return <div className="flex h-full w-full items-center justify-center text-5xl">💅</div>;
  }
  return (
    <img
      src={src as string}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}
