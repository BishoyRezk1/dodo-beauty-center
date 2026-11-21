import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: unknown } | undefined;
  if (!session || !user?.role) redirect("/admin/login");
  return session;
}
