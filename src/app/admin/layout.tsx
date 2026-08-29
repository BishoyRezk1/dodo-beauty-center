import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata = { title: "لوحة تحكم DoDo Beauty Center" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <SessionProviderWrapper>{children}</SessionProviderWrapper>;
}
