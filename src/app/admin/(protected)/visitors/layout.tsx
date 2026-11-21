import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function GuardedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
