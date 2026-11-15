import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { productPatchSchema } from "@/lib/shop/schemas";
import { fail, isUnique, productDto, slugFrom } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = productPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  const { slug, sku, ...rest } = parsed.data;
  try {
    const p = await prisma.shopProduct.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(slug !== undefined ? { slug: slugFrom(rest.name ?? "item", slug) } : {}),
        ...(sku !== undefined ? { sku: sku || null } : {})
      },
      include: { category: true }
    });
    return NextResponse.json({ product: productDto(p, true) });
  } catch (e) {
    if (isUnique(e)) return fail("كود SKU أو الرابط مستخدم قبل كده", 409);
    return fail("تعذر تعديل المنتج", 500);
  }
}

// DELETE = archive (soft). Order history keeps its own copy of name/price.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await prisma.shopProduct.update({ where: { id: params.id }, data: { isArchived: true, isActive: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return fail("تعذر أرشفة المنتج", 500);
  }
}
