import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const rows = await prisma.quickReply.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(rows);
}

const schema = z.object({ title: z.string().trim().min(1).max(40), body: z.string().trim().min(1).max(1000) });

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const count = await prisma.quickReply.count();
  if (count >= 30) return NextResponse.json({ error: "وصلتي للحد الأقصى (30 رد)" }, { status: 400 });
  const row = await prisma.quickReply.create({ data: { ...parsed.data, sortOrder: count + 1 } });
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  await prisma.quickReply.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
