import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entrySchema, noon, serialize } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const p = entrySchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = p.data;

  try {
    const e = await prisma.financeEntry.update({
      where: { id: params.id },
      data: {
        type: d.type,
        amount: Math.round(d.amount * 100) / 100,
        category: d.category,
        method: d.method,
        entryDate: noon(d.date),
        description: d.description || null,
      },
    });
    return NextResponse.json(serialize(e));
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.financeEntry.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
