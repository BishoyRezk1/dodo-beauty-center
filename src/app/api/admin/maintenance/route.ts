import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getMaintenance, MAINTENANCE_KEY, MAINTENANCE_MSG_KEY } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getMaintenance());
}

const schema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(300).optional()
});

async function put(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  await put(MAINTENANCE_KEY, parsed.data.enabled ? "1" : "0");
  if (parsed.data.message !== undefined) await put(MAINTENANCE_MSG_KEY, parsed.data.message);

  return NextResponse.json(await getMaintenance());
}
