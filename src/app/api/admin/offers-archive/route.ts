import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tab = new URL(req.url).searchParams.get("tab") || "active";
  await prisma.offer.updateMany({ where: { archivedAt: null, endDate: { lt: new Date() } }, data: { archivedAt: new Date(), isActive: false } });
  const now = new Date();
  const where =
    tab === "archived" ? { archivedAt: { not: null } }
    : tab === "ended" ? { archivedAt: null, endDate: { lt: now } }
    : { archivedAt: null, endDate: { gte: now } };
  const offers = await prisma.offer.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(offers);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { duplicateFrom } = await req.json();
  const o = await prisma.offer.findUnique({ where: { id: duplicateFrom } });
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86400000); end.setHours(23, 59, 59, 0);
  const copy = await prisma.offer.create({
    data: {
      title: o.title, details: o.details, imageUrl: o.imageUrl,
      oldPrice: o.oldPrice, newPrice: o.newPrice, serviceId: o.serviceId,
      startDate: start, endDate: end, isActive: true,
    },
  });
  return NextResponse.json(copy);
}
