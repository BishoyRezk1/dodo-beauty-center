import AnnouncementBanner from "@/components/AnnouncementBanner";
import type { Metadata, Viewport } from "next";
import { Almarai, El_Messiri } from "next/font/google";
import "./globals.css";
import { getSettings, SETTING_KEYS } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getMaintenance } from "@/lib/maintenance";
import LiquidCursorEffect from "@/components/site/LiquidCursorEffect";
import VisitTracker from "@/components/site/VisitTracker";
import BottomNav from "@/components/site/BottomNav";
import PwaRegister from "@/components/site/PwaRegister";
import AdminInstall from "@/components/site/AdminInstall";
import SiteGate from "@/components/site/SiteGate";

// Maintenance mode must take effect immediately, so never statically cache the shell.
export const dynamic = "force-dynamic";

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-body"
});

const elMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E91E63"
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.site_name || "Zina Nails",
    description: settings.site_tagline || "احجزي موعدك أونلاين في Zina Nails",
    manifest: "/app.webmanifest",
    icons: { icon: "/favicon.ico", apple: "/pwa-icon?size=180" },
    appleWebApp: { capable: true, title: "Zina Nails", statusBarStyle: "default" }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, maintenance] = await Promise.all([getSettings(), getMaintenance()]);
  const whatsappHref = buildWhatsAppLink(
    settings[SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER],
    "مرحبًا، أريد الاستفسار عن الخدمات في Zina Nails"
  );

  return (
    <html lang="ar" dir="rtl" className={`${almarai.variable} ${elMessiri.variable}`}>
      <body className="font-body antialiased">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/logo-watermark.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "220px auto",
            opacity: 0.08
          }}
        />
        <div className="relative z-10">
          <SiteGate maintenance={maintenance.on} message={maintenance.message}>
            <AnnouncementBanner />
            {children}
            <LiquidCursorEffect />
            <VisitTracker />
            <BottomNav whatsappHref={whatsappHref} />
          </SiteGate>
          <PwaRegister />
          <AdminInstall />
        </div>
      </body>
    </html>
  );
}
