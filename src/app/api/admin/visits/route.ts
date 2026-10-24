import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" });
const cDay = (d: Date) => fmt.format(d);
const DAYMS = 86400000;
const CAP = 5000;

export async function GET(req: Request) {
  const g = await requireOwner();
  if (!g.ok) return g.res;

  const range = new URL(req.url).searchParams.get("range") || "today";
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 0;
  const now = Date.now();
  const startDay = days ? cDay(new Date(now - (days - 1) * DAYMS)) : "";

  const rows = await prisma.pageView.findMany({
    where: days ? { createdAt: { gte: new Date(now - (days + 1) * DAYMS) } } : {},
    orderBy: { createdAt: "desc" },
    take: CAP,
  });
  const list = days ? rows.filter((r) => cDay(r.createdAt) >= startDay) : rows;

  const tally = (f: (r: (typeof list)[number]) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of list) {
      const k = f(r) || "غير معروف";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  };

  return NextResponse.json({
    total: list.length,
    truncated: rows.length >= CAP,
    devices: tally((r) => r.device),
    sources: tally((r) => r.source),
    places: tally((r) => [r.city, r.country].filter(Boolean).join("، ") || null),
    paths: tally((r) => r.path),
    entries: list.slice(0, 200).map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      path: r.path,
      device: r.device,
      browser: r.browser,
      os: r.os,
      source: r.source,
      country: r.country,
      city: r.city,
    })),
  });
}
