import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 30;

const GRAPH = "https://graph.facebook.com/v21.0";

const fail = (error: string, status = 400) =>
  NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("غير مصرح", 401);

  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!pageId || !token) return fail("FB_PAGE_ID / FB_PAGE_TOKEN مش متضافين في Vercel", 500);

  try {
    const fd = await req.formData();
    const message = String(fd.get("message") || "").trim();
    const link = String(fd.get("link") || "").trim();
    const imageUrl = String(fd.get("imageUrl") || "").trim();
    const scheduleAt = String(fd.get("scheduleAt") || "").trim();
    const f = fd.get("image");
    const img = f instanceof File && f.size > 0 ? f : null;

    if (!message && !img && !imageUrl) return fail("اكتب نص أو ضيف صورة");
    if (img && img.size > 4 * 1024 * 1024) return fail("الصورة أكبر من 4MB");

    const body = new FormData();
    body.append("access_token", token);

    if (scheduleAt) {
      const ts = Math.floor(new Date(scheduleAt).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (!ts || ts < now + 600 || ts > now + 75 * 86400)
        return fail("ميعاد الجدولة لازم يكون بين 10 دقايق و75 يوم من دلوقتي");
      body.append("published", "false");
      body.append("scheduled_publish_time", String(ts));
    }

    let endpoint = "/feed";
    if (img || imageUrl) {
      endpoint = "/photos";
      body.append("caption", message);
      if (img) body.append("source", img, img.name);
      else body.append("url", imageUrl);
    } else {
      body.append("message", message);
      if (link) body.append("link", link);
    }

    const r = await fetch(GRAPH + "/" + pageId + endpoint, { method: "POST", body });
    const data = await r.json();
    if (!r.ok || data.error) return fail(data.error?.message || "فشل النشر");

    const id = data.post_id || data.id;
    return NextResponse.json({ ok: true, id, url: "https://www.facebook.com/" + id, scheduled: !!scheduleAt });
  } catch {
    return fail("حصلت مشكلة أثناء النشر", 500);
  }
}
