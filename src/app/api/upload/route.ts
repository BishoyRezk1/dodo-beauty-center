import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";

// POST /api/upload — multipart/form-data with a single "file" field.
// Used by the public booking flow to upload the Vodafone Cash transfer
// screenshot before the booking is submitted.
export async function POST(req: NextRequest) {
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
