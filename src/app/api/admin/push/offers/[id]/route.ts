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
  if (typeof b.body === "string") data.body = b.body;
  if (typeof b.url === "string") data.url = b.url;
  if (b.status === "archived") { data.status = "archived"; data.archivedAt = new Date(); }
  if (b.status === "active") { data.status = "active"; data.archivedAt = null; }
  try {
    const offer = await prisma.pushOffer.update({ where: { id: params.id }, data });
    return NextResponse.json(offer);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.pushOffer.delete({ where: { id: params.id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
