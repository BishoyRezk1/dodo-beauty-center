import type { Metadata } from "next";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "لوحة تحكم Zina Nails",
  manifest: "/admin-app.webmanifest",
  icons: { icon: "/pwa-icon?size=192&v=admin", apple: "/pwa-icon?size=180&v=admin" },
  appleWebApp: { capable: true, title: "Zina Admin", statusBarStyle: "default" }
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <SessionProviderWrapper>{children}</SessionProviderWrapper>;
}
