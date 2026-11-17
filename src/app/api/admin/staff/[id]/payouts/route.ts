import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, requireOwner } from "@/lib/ledger";
import { accountId, fail, money, toCents } from "@/lib/invoices";
import { payoutSchema, staffDueCents } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireOwner();
  if (!g.ok) return g.res;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = payoutSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;
  const key = (req.headers.get("idempotency-key") || "").slice(0, 100) || null;

  if (key) {
    const ex = await prisma.staffPayout.findUnique({ where: { idempotencyKey: key } });
    if (ex) return NextResponse.json({ id: ex.id, duplicate: true });
  }

  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

  try {
    const out = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Staff" WHERE "id" = ${params.id} FOR UPDATE`;
      const st = await tx.staff.findUnique({ where: { id: params.id } });
      if (!st) throw new Error("NOTFOUND");
      const bal = await staffDueCents(tx, st.id);
      if (!bal) throw new Error("NOTFOUND");
      const amt = toCents(d.amount);
      if (amt > bal.due) throw new Error("OVERDUE");
      const acc = await accountId(tx, d.method);
      if (!acc) throw new Error("ACCOUNT");

      const e = await tx.ledgerEntry.create({
        data: {
          type: "expense",
          category: "رواتب وأجور",
          accountId: acc,
          amount: money(amt),
          entryDate: new Date(`${ymd}T12:00:00.000Z`),
          description: `عمولة ${st.name}${d.note ? " - " + d.note : ""}`,
          source: "STAFF_PAYOUT",
          idempotencyKey: key ? `payout:${key}` : null,
          createdById: g.actor.id,
        },
      });
      const po = await tx.staffPayout.create({
        data: {
          staffId: st.id,
          amount: money(amt),
          accountId: acc,
          ledgerEntryId: e.id,
          note: d.note || null,
          createdById: g.actor.id,
          idempotencyKey: key,
        },
      });
      await audit(tx, {
        actor: g.actor, action: "PAYOUT", entity: "Staff", entityId: st.id,
        before: { due: bal.due / 100 },
        after: { payoutId: po.id, ledgerEntryId: e.id, amount: amt / 100, method: d.method },
      });
      return po;
    });
    return NextResponse.json({ id: out.id });
  } catch (err) {
    const m = (err as Error).message;
    if (m === "NOTFOUND") return NextResponse.json({ error: "الموظفة غير موجودة" }, { status: 404 });
    if (m === "OVERDUE") return NextResponse.json({ error: "المبلغ أكبر من المستحق" }, { status: 400 });
    if (m === "ACCOUNT") return NextResponse.json({ error: "الحساب غير موجود" }, { status: 400 });
    if ((err as { code?: string })?.code === "P2002" && key) {
      const ex = await prisma.staffPayout.findUnique({ where: { idempotencyKey: key } });
      if (ex) return NextResponse.json({ id: ex.id, duplicate: true });
    }
    return fail(err);
  }
}
