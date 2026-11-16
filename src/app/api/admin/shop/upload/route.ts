import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { uploadImage } from "@/lib/storage";
import { fail } from "@/lib/shop/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return fail("لم يتم إرفاق صورة");
    const head = Buffer.from(await file.arrayBuffer()).subarray(0, 12);
    const jpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const png = head[0] === 0x89 && head.toString("ascii", 1, 4) === "PNG";
    const webp = head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
    if (!jpg && !png && !webp) return fail("الملف مش صورة صالحة");
    const url = await uploadImage(file, "shop-products");
    return NextResponse.json({ url });
  } catch (e) {
    return fail((e as Error).message || "فشل رفع الصورة");
  }
}
