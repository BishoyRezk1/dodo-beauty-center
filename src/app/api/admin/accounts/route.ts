import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";
import { summarizeOne } from "@/lib/treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  const accounts = await prisma.financeAccount.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "asc" }, { code: "asc" }],
  });
  const out: Awaited<ReturnType<typeof summarizeOne>>[] = [];
  for (const a of accounts) out.push(await summarizeOne(a));
  return NextResponse.json({ accounts: out });
}
