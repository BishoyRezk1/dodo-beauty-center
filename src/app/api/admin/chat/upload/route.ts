import type { ErrLike } from "@/lib/err-like";
import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const file = (await req.formData()).get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "لم يتم إرفاق صورة" }, { status: 400 });
    const b = Buffer.from(await file.arrayBuffer()).subarray(0, 12);
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG";
    const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    if (!jpg && !png && !webp) return NextResponse.json({ error: "الملف مش صورة صالحة" }, { status: 400 });
    return NextResponse.json({ url: await uploadImage(file, "chat") });
  } catch (err_) { const err = err_ as ErrLike;
    return NextResponse.json({ error: err.message || "فشل رفع الصورة" }, { status: 400 });
  }
}
