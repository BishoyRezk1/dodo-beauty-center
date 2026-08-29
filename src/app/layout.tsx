import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display"
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.site_name || "DoDo Beauty Center",
    description: settings.site_tagline || "احجزي موعدك أونلاين في DoDo Beauty Center",
    icons: { icon: "/favicon.ico" }
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
