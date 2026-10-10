import type { MetadataRoute } from "next";
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dodo-beauty-center.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/offers", "/booking", "/review"].map((p) => ({
    url: base + p,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.7
  }));
}
