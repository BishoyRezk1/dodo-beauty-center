import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof b.title === "string") data.title = b.title;
  if (typeof b.details === "string") data.details = b.details;
  if (b.oldPrice !== undefined) data.oldPrice = Number(b.oldPrice);
  if (b.newPrice !== undefined) data.newPrice = Number(b.newPrice);
  if (b.startDate) data.startDate = new Date(b.startDate);
  if (b.endDate) data.endDate = new Date(b.endDate);
  if (b.action === "archive") { data.isActive = false; data.archivedAt = new Date(); }
  if (b.action === "restore") { data.isActive = true; data.archivedAt = null; }
  try {
    const offer = await prisma.offer.update({ where: { id: params.id }, data });
    return NextResponse.json(offer);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.offer.delete({ where: { id: params.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
