import type { Metadata } from "next";
import { Almarai, El_Messiri } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import LiquidCursorEffect from "@/components/site/LiquidCursorEffect";

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.site_name || "Zina Nails",
    description: settings.site_tagline || "احجزي موعدك أونلاين في Zina Nails",
    icons: { icon: "/favicon.ico" }
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${almarai.variable} ${elMessiri.variable}`}>
      <body className="font-body antialiased">
        {children}
        <LiquidCursorEffect />
      </body>
    </html>
  );
}
