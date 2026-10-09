import { prisma } from "@/lib/prisma";

export type Reward = { id: string; title: string; cost: number; discountPercent: number };
export type LoyaltyConfig = {
  enabled: boolean;
  perBooking: number;
  perReview: number;
  silverAt: number;
  goldAt: number;
  rewards: Reward[];
};

const K = {
  enabled: "loyalty_enabled",
  perBooking: "loyalty_per_booking",
  perReview: "loyalty_per_review",
  silverAt: "loyalty_silver_at",
  goldAt: "loyalty_gold_at",
  rewards: "loyalty_rewards"
} as const;

export const DEFAULT_REWARDS: Reward[] = [
  { id: "r1", title: "خصم 10% على حجزك", cost: 100, discountPercent: 10 },
  { id: "r2", title: "خصم 20% على حجزك", cost: 200, discountPercent: 20 }
];

export const DEFAULT_CONFIG: LoyaltyConfig = {
  enabled: false,
  perBooking: 10,
  perReview: 5,
  silverAt: 100,
  goldAt: 300,
  rewards: DEFAULT_REWARDS
};

function num(v: string | undefined, d: number) {
  if (v === undefined || v.trim() === "") return d;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
}

function parseRewards(v: string | undefined): Reward[] {
  if (!v) return DEFAULT_REWARDS;
  try {
    const arr = JSON.parse(v);
    if (!Array.isArray(arr)) return DEFAULT_REWARDS;
    const out: Reward[] = [];
    for (const r of arr.slice(0, 10)) {
      if (
        r &&
        typeof r.id === "string" &&
        typeof r.title === "string" &&
        Number.isInteger(r.cost) &&
        r.cost > 0 &&
        Number.isInteger(r.discountPercent) &&
        r.discountPercent >= 1 &&
        r.discountPercent <= 100
      ) {
        out.push({ id: r.id, title: r.title.slice(0, 60), cost: r.cost, discountPercent: r.discountPercent });
      }
    }
    return out;
  } catch {
    return DEFAULT_REWARDS;
  }
}

/** Never throws: on any failure the program stays disabled. */
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(K) } } });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    return {
      enabled: m.get(K.enabled) === "1",
      perBooking: num(m.get(K.perBooking), DEFAULT_CONFIG.perBooking),
      perReview: num(m.get(K.perReview), DEFAULT_CONFIG.perReview),
      silverAt: num(m.get(K.silverAt), DEFAULT_CONFIG.silverAt),
      goldAt: num(m.get(K.goldAt), DEFAULT_CONFIG.goldAt),
      rewards: parseRewards(m.get(K.rewards))
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveLoyaltyConfig(c: LoyaltyConfig) {
  const entries: [string, string][] = [
    [K.enabled, c.enabled ? "1" : "0"],
    [K.perBooking, String(c.perBooking)],
    [K.perReview, String(c.perReview)],
    [K.silverAt, String(c.silverAt)],
    [K.goldAt, String(c.goldAt)],
    [K.rewards, JSON.stringify(c.rewards)]
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

export async function getTotals(customerId: string) {
  const [all, earned] = await Promise.all([
    prisma.loyaltyTransaction.aggregate({ where: { customerId }, _sum: { points: true } }),
    prisma.loyaltyTransaction.aggregate({ where: { customerId, points: { gt: 0 } }, _sum: { points: true } })
  ]);
  return { balance: all._sum.points ?? 0, lifetime: earned._sum.points ?? 0 };
}

export function levelFor(lifetime: number, cfg: LoyaltyConfig) {
  if (lifetime >= cfg.goldAt) return { key: "GOLD", label: "ذهبية 🥇", floor: cfg.goldAt, nextAt: null as number | null };
  if (lifetime >= cfg.silverAt) return { key: "SILVER", label: "فضية 🥈", floor: cfg.silverAt, nextAt: cfg.goldAt as number | null };
  return { key: "BRONZE", label: "برونزية 🥉", floor: 0, nextAt: cfg.silverAt as number | null };
}

/** Idempotent when refKey is given (unique). Never throws. */
export async function awardPoints(
  customerId: string,
  points: number,
  type: string,
  reason: string,
  refKey?: string
) {
  if (!points) return false;
  try {
    await prisma.loyaltyTransaction.create({
      data: { customerId, points, type, reason, refKey: refKey ?? null }
    });
    return true;
  } catch {
    return false;
  }
}

export async function awardBookingPoints(bookingId: string) {
  try {
    const cfg = await getLoyaltyConfig();
    if (!cfg.enabled || cfg.perBooking <= 0) return;
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, service: { select: { name: true } } }
    });
    if (!b) return;
    await awardPoints(b.customerId, cfg.perBooking, "BOOKING", `إتمام حجز: ${b.service.name}`, `BOOKING:${bookingId}`);
  } catch {}
}

export async function awardReviewPoints(reviewId: string) {
  try {
    const cfg = await getLoyaltyConfig();
    if (!cfg.enabled || cfg.perReview <= 0) return;
    const r = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { booking: { select: { customerId: true } } }
    });
    const customerId = r?.booking?.customerId;
    if (!customerId) return;
    await awardPoints(customerId, cfg.perReview, "REVIEW", "تقييمك للخدمة", `REVIEW:${reviewId}`);
  } catch {}
}
