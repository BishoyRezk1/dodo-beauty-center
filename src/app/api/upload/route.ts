import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";
import { rateLimitDb, getClientIp } from "@/lib/rate-limit";

// POST /api/upload — multipart/form-data with a single "file" field.
// Used by the public booking flow to upload the Vodafone Cash transfer
// screenshot before the booking is submitted.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = await rateLimitDb(`upload:${ip}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "محاولات رفع كتيرة، برجاء الانتظار شوية والمحاولة تاني." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم إرفاق صورة" }, { status: 400 });
    }

    const head = Buffer.from(await file.arrayBuffer()).subarray(0, 12);
    const jpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const png = head[0] === 0x89 && head.toString("ascii", 1, 4) === "PNG";
    const webp = head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
    if (!jpg && !png && !webp) {
      return NextResponse.json({ error: "الملف مش صورة صالحة" }, { status: 400 });
    }

    const url = await uploadImage(file, "payment-screenshots");
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل رفع الصورة" }, { status: 400 });
  }
}
