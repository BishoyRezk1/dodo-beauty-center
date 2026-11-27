import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type Db = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export type DueInfo = { id: string; total: number; collected: number; remaining: number };

const r2 = (n: number) => Math.round(n * 100) / 100;
let ready: Promise<void> | null = null;

export function ensureDues(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(
        'CREATE TABLE IF NOT EXISTS "LedgerDue" ("id" TEXT PRIMARY KEY, "entryId" TEXT NOT NULL UNIQUE, "dueAmount" DECIMAL(14,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)'
      );
      await prisma.$executeRawUnsafe(
        'CREATE TABLE IF NOT EXISTS "LedgerDueCollection" ("id" TEXT PRIMARY KEY, "dueId" TEXT NOT NULL, "entryId" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)'
      );
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LedgerDueCollection_dueId_idx" ON "LedgerDueCollection" ("dueId")');
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function dueOf(db: Db, entryId: string): Promise<DueInfo | null> {
  const rows = await db.$queryRaw<{ id: string; due: number; collected: number }[]>`
    SELECT d."id", d."dueAmount"::float8 AS due,
      COALESCE((SELECT SUM(l."amount") FROM "LedgerDueCollection" c JOIN "LedgerEntry" l ON l."id" = c."entryId"
                WHERE c."dueId" = d."id" AND l."status" = 'POSTED'), 0)::float8 AS collected
    FROM "LedgerDue" d WHERE d."entryId" = ${entryId}`;
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, total: r2(r.due), collected: r2(r.collected), remaining: r2(r.due - r.collected) };
}

export async function loadDues(ids: string[]): Promise<Map<string, DueInfo>> {
  const out = new Map<string, DueInfo>();
  if (!ids.length) return out;
  try {
    await ensureDues();
    const rows = await prisma.$queryRaw<{ id: string; entryId: string; due: number; collected: number }[]>`
      SELECT d."id", d."entryId", d."dueAmount"::float8 AS due,
        COALESCE((SELECT SUM(l."amount") FROM "LedgerDueCollection" c JOIN "LedgerEntry" l ON l."id" = c."entryId"
                  WHERE c."dueId" = d."id" AND l."status" = 'POSTED'), 0)::float8 AS collected
      FROM "LedgerDue" d WHERE d."entryId" = ANY(${ids}::text[])`;
    for (const r of rows) out.set(r.entryId, { id: r.id, total: r2(r.due), collected: r2(r.collected), remaining: r2(r.due - r.collected) });
  } catch (e) {
    console.error("dues load failed", e);
  }
  return out;
}

export async function outstanding(): Promise<{ total: number; count: number }> {
  try {
    await ensureDues();
    const rows = await prisma.$queryRaw<{ total: number; count: number }[]>`
      SELECT COALESCE(SUM(x.rem), 0)::float8 AS total, COUNT(*)::int AS count FROM (
        SELECT d."dueAmount" - COALESCE((SELECT SUM(l."amount") FROM "LedgerDueCollection" c JOIN "LedgerEntry" l ON l."id" = c."entryId"
                                         WHERE c."dueId" = d."id" AND l."status" = 'POSTED'), 0) AS rem
        FROM "LedgerDue" d JOIN "LedgerEntry" e ON e."id" = d."entryId" AND e."status" = 'POSTED'
      ) x WHERE x.rem > 0.001`;
    return { total: r2(rows[0]?.total ?? 0), count: rows[0]?.count ?? 0 };
  } catch (e) {
    console.error("outstanding failed", e);
    return { total: 0, count: 0 };
  }
}
