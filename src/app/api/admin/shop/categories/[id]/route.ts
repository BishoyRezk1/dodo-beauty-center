import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { categoryPatchSchema } from "@/lib/shop/schemas";
import { fail, isUnique, slugFrom } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = categoryPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  const { slug, ...rest } = parsed.data;
  try {
    const item = await prisma.shopCategory.update({
      where: { id: params.id },
      data: { ...rest, ...(slug !== undefined ? { slug: slugFrom(rest.name ?? "cat", slug) } : {}) }
    });
    return NextResponse.json({ item });
  } catch (e) {
    if (isUnique(e)) return fail("الرابط مستخدم قبل كده", 409);
    return fail("تعذر تعديل التصنيف", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const count = await prisma.shopProduct.count({ where: { categoryId: params.id } });
  if (count > 0) return fail("فيه منتجات في التصنيف ده، اخفيه بدل ما تحذفه", 409);
  try {
    await prisma.shopCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return fail("تعذر حذف التصنيف", 500);
  }
}
