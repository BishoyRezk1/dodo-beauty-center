import type { ErrLike } from "@/lib/err-like";
import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/storage";
import { rateLimitDb } from "@/lib/rate-limit";
import { getCustomer } from "@/lib/customer-session";

// POST /api/chat/upload — logged-in customers only; verifies real image bytes.
export async function POST(req: NextRequest) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "سجّلي دخول الأول" }, { status: 401 });

  const { allowed } = await rateLimitDb(`chat-upload:${c.id}`, 20, 10 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "رفع صور كتير، استني شوية." }, { status: 429 });

  try {
    const file = (await req.formData()).get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "لم يتم إرفاق صورة" }, { status: 400 });
    }
    const b = Buffer.from(await file.arrayBuffer()).subarray(0, 12);
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG";
    const webp = b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    if (!jpg && !png && !webp) {
      return NextResponse.json({ error: "الملف مش صورة صالحة" }, { status: 400 });
    }
    const url = await uploadImage(file, "chat");
    return NextResponse.json({ url });
  } catch (err_) { const err = err_ as ErrLike;
    return NextResponse.json({ error: err.message || "فشل رفع الصورة" }, { status: 400 });
  }
}
