import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`review-upload:${getClientIp(req)}`, 8, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "رفع صور كتير، استني شوية." }, { status: 429 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const bookingNumber = String(form.get("bookingNumber") || "").trim().slice(0, 40);
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "لم يتم إرفاق صورة" }, { status: 400 });
    if (!bookingNumber) return NextResponse.json({ error: "رقم الحجز مطلوب" }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      select: { status: true, review: { select: { id: true } } }
    });
    if (!booking || booking.status !== "COMPLETED" || booking.review) {
      return NextResponse.json({ error: "مش متاح رفع صورة لهذا الحجز" }, { status: 400 });
    }

    const b = Buffer.from(await file.arrayBuffer()).subarray(0, 12);
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG";
    const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    if (!jpg && !png && !webp) return NextResponse.json({ error: "الملف مش صورة صالحة" }, { status: 400 });

    return NextResponse.json({ url: await uploadImage(file, "review-photos") });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل رفع الصورة" }, { status: 400 });
  }
}
