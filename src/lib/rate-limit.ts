import { prisma } from "@/lib/prisma";
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limiter keyed by IP + route. Free, no external
 * service. Good enough to stop basic spam/abuse on public endpoints.
 * Note: resets on cold start and isn't shared across serverless instances,
 * so it's a best-effort throttle, not a hard guarantee.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}


/**
 * Persistent (Postgres) fixed-window limiter, shared across all serverless instances.
 * Atomic upsert. If the DB check fails, falls back to the in-memory limiter.
 */
export async function rateLimitDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const secs = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + (${secs}::double precision * INTERVAL '1 second'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW()
                         THEN NOW() + (${secs}::double precision * INTERVAL '1 second')
                         ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    const count = Number(rows[0]?.count ?? 1);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    const r: any = rateLimit(key, limit, windowMs);
    return { allowed: !!r.allowed, remaining: Number(r.remaining ?? 0) };
  }
}
