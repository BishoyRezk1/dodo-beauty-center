import { z } from "zod";

export const TYPES = ["income", "expense"] as const;
export const METHODS = ["cash", "vodafone_cash"] as const;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(d: string) {
  const t = new Date(d + "T12:00:00.000Z");
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export const entrySchema = z.object({
  type: z.enum(TYPES),
  amount: z.coerce.number().positive().max(10000000),
  category: z.string().trim().min(1).max(50),
  method: z.enum(METHODS),
  date: z.string().regex(DATE_RE).refine(validDate, "bad date"),
  description: z.string().trim().max(300).optional().nullable(),
});

export function cairoToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
}
export const dayStart = (d: string) => new Date(d + "T00:00:00.000Z");
export const dayEnd = (d: string) => new Date(d + "T23:59:59.999Z");
export const noon = (d: string) => new Date(d + "T12:00:00.000Z");

export function serialize(e: {
  id: string; type: string; amount: unknown; category: string; method: string;
  entryDate: Date; description: string | null;
}) {
  return {
    id: e.id,
    type: e.type,
    amount: Number(e.amount),
    category: e.category,
    method: e.method,
    date: e.entryDate.toISOString().slice(0, 10),
    description: e.description,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function bucket(rows: { type: string; method: string; amount: unknown }[]) {
  const mk = () => ({ income: 0, expense: 0, net: 0 });
  const out: Record<string, { income: number; expense: number; net: number }> = {
    all: mk(), cash: mk(), vodafone_cash: mk(),
  };
  for (const r of rows) {
    const a = Number(r.amount);
    const k = r.type === "income" ? "income" : "expense";
    out.all[k] += a;
    if (out[r.method]) out[r.method][k] += a;
  }
  for (const k of Object.keys(out)) {
    out[k].income = r2(out[k].income);
    out[k].expense = r2(out[k].expense);
    out[k].net = r2(out[k].income - out[k].expense);
  }
  return out;
}
