import { z } from "zod";

export const staffSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  commissionType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  commissionValue: z.number().min(0).max(100000).default(0),
  notes: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).max(200).optional(),
});

export const payoutSchema = z.object({
  amount: z.number().positive().max(10000000),
  method: z.enum(["cash", "vodafone_cash"]),
  note: z.string().trim().max(200).optional().nullable(),
});

import type { Prisma } from "@prisma/client";

export async function staffDueCents(tx: Prisma.TransactionClient, staffId: string) {
  const s = await tx.staff.findUnique({ where: { id: staffId } });
  if (!s) return null;
  const items = await tx.invoiceItem.aggregate({
    where: { staffId, invoice: { status: { not: "CANCELLED" } } },
    _sum: { lineTotal: true, quantity: true },
  });
  const pay = await tx.staffPayout.aggregate({ where: { staffId }, _sum: { amount: true } });
  const salesC = Math.round(Number(items._sum.lineTotal || 0) * 100);
  const qty = Number(items._sum.quantity || 0);
  const cv = Number(s.commissionValue);
  const earned = s.commissionType === "PERCENT" ? Math.round((salesC * cv) / 100) : Math.round(qty * cv * 100);
  const paid = Math.round(Number(pay._sum.amount || 0) * 100);
  return { earned, paid, due: earned - paid };
}
