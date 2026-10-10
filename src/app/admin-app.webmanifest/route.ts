export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/admin/",
    name: "Zina Nails - الأدمن",
    short_name: "Zina Admin",
    description: "لوحة تحكم Zina Nails",
    start_url: "/admin/dashboard",
    scope: "/admin/",
    display: "standalone",
    lang: "ar",
    dir: "rtl",
    background_color: "#FFF5F7",
    theme_color: "#4A2C35",
    icons: [
      { src: "/icons/admin-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/admin-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Zina Chat", url: "/admin/chat" },
      { name: "الحجوزات", url: "/admin/bookings" }
    ]
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" }
  });
}
