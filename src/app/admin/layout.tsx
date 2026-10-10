import type { Metadata } from "next";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "لوحة تحكم Zina Nails",
  manifest: "/admin-app.webmanifest",
  icons: { icon: "/icons/admin-192.png", apple: "/icons/apple-180.png&v=admin" },
  appleWebApp: { capable: true, title: "Zina Admin", statusBarStyle: "default" }
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <SessionProviderWrapper>{children}</SessionProviderWrapper>;
}
