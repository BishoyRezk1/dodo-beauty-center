import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zina Nails",
    short_name: "Zina Nails",
    description: "احجزي موعدك في Zina Nails 💅🏻",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    background_color: "#FFF5F7",
    theme_color: "#E91E63",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "احجزي الآن", url: "/booking" },
      { name: "Zina Chat", url: "/chat" },
      { name: "حجوزاتي", url: "/account" }
    ]
  };
}
