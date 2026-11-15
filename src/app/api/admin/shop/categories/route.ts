import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { categorySchema } from "@/lib/shop/schemas";
import { fail, isUnique, slugFrom } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const items = await prisma.shopCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true } } }
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = categorySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  const d = parsed.data;
  try {
    const item = await prisma.shopCategory.create({
      data: {
        name: d.name,
        slug: slugFrom(d.name, d.slug),
        imageUrl: d.imageUrl ?? null,
        sortOrder: d.sortOrder ?? 0,
        isActive: d.isActive ?? true
      }
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (isUnique(e)) return fail("الرابط مستخدم قبل كده", 409);
    return fail("تعذر حفظ التصنيف", 500);
  }
}
