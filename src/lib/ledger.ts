import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Actor = { id: string | null; name: string | null };
type Guard = { ok: true; actor: Actor } | { ok: false; res: NextResponse };

export async function requireOwner(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  const u = session?.user as unknown as
    | { id?: string; email?: string | null; name?: string | null; role?: string }
    | undefined;
  if (!u) {
    return { ok: false, res: NextResponse.json({ error: "غير مصرح لك بالدخول" }, { status: 401 }) };
  }
  let role = u.role;
  let id: string | null = u.id ?? null;
  let name: string | null = u.name ?? null;
  if (!role) {
    const ors: Prisma.AdminUserWhereInput[] = [];
    if (u.id) ors.push({ id: u.id });
    if (u.email) ors.push({ email: u.email });
    const admin = ors.length
      ? await prisma.adminUser.findFirst({
          where: { OR: ors },
          select: { id: true, name: true, role: true },
        })
      : null;
    if (admin) {
      role = admin.role;
      id = admin.id;
      name = admin.name;
    }
  }
  if (role !== "OWNER") {
    return { ok: false, res: NextResponse.json({ error: "هذه العملية للمدير فقط" }, { status: 403 }) };
  }
  return { ok: true, actor: { id, name } };
}

export async function audit(
  tx: Prisma.TransactionClient,
  a: {
    actor: Actor;
    action: string;
    entity: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }
) {
  await tx.auditLog.create({
    data: {
      actorId: a.actor.id,
      actorName: a.actor.name,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId ?? null,
      before: a.before === undefined ? undefined : (a.before as Prisma.InputJsonValue),
      after: a.after === undefined ? undefined : (a.after as Prisma.InputJsonValue),
      reason: a.reason ?? null,
    },
  });
}

type Row = {
  id: string;
  entryNo: bigint;
  type: string;
  amount: unknown;
  category: string;
  entryDate: Date;
  description: string | null;
  account: { code: string };
};

export function serializeLedger(e: Row) {
  return {
    id: e.id,
    entryNo: Number(e.entryNo),
    type: e.type,
    amount: Number(e.amount),
    category: e.category,
    method: e.account.code,
    date: e.entryDate.toISOString().slice(0, 10),
    description: e.description,
  };
}
