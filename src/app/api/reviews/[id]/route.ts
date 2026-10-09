import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { awardReviewPoints } from "@/lib/loyalty";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const data: { isApproved?: boolean; isFeatured?: boolean } = {};
  if ("isApproved" in body) data.isApproved = !!body.isApproved;
  if ("isFeatured" in body) data.isFeatured = !!body.isFeatured;
  if (data.isFeatured === true) data.isApproved = true; // featuring implies approved
  if (data.isApproved === false) data.isFeatured = false; // hiding removes the feature
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "لا يوجد تغيير" }, { status: 400 });
  }

  try {
    const review = await prisma.review.update({ where: { id: params.id }, data });
    // Idempotent (unique refKey): at most one award per review, never on repeat approvals.
    if (review.isApproved) await awardReviewPoints(review.id);
    return NextResponse.json(review);
  } catch {
    return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
  }
}
