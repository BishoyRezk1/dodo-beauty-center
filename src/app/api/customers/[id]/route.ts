import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const data: any = {};
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;
  if (typeof body.isBlocked === "boolean") data.isBlocked = body.isBlocked;

  const customer = await prisma.customer.update({ where: { id: params.id }, data });
  return NextResponse.json(customer);
}
