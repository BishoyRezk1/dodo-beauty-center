import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/upload — multipart/form-data with a single "file" field.
// Used by the public booking flow to upload the Vodafone Cash transfer
// screenshot before the booking is submitted.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`upload:${ip}`, 10, 10 * 60 * 1000);
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

    const url = await uploadImage(file, "payment-screenshots");
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل رفع الصورة" }, { status: 400 });
  }
}
