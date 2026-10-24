export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/",
    name: "Zina Nails",
    short_name: "Zina Nails",
    description: "احجزي موعدك في Zina Nails 💅🏻",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#FFF5F7",
    theme_color: "#E91E63",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "احجزي الآن", url: "/booking" },
      { name: "Zina Chat", url: "/chat" },
      { name: "حجوزاتي", url: "/account" }
    ]
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" }
  });
}
