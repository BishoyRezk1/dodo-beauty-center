/**
 * Uploads an image straight from the browser to Cloudinary's unsigned
 * upload endpoint, bypassing our own API route entirely.
 *
 * Why: Vercel's serverless functions have a hard ~4.5MB request body limit.
 * A phone photo or a hi-res screenshot can easily exceed that, and when it
 * does, Vercel returns a non-JSON error response — which crashed our old
 * "upload via /api/upload" flow with a confusing "Unexpected end of JSON
 * input" error. Uploading directly to Cloudinary from the browser sidesteps
 * that limit completely.
 *
 * Falls back to the old server-side /api/upload route if the public
 * Cloudinary env vars aren't configured (e.g. local dev without them set).
 */

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — generous for phone photos/screenshots
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function uploadImageDirect(file: File, folder: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("صيغة الملف غير مدعومة. الرجاء رفع صورة JPG أو PNG أو WEBP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("حجم الصورة كبير جدًا. برجاء اختيار صورة أصغر (أقل من 8 ميجابايت).");
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    let res: Response;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
    } catch {
      throw new Error("تعذّر الاتصال بالإنترنت أثناء رفع الصورة. حاولي مرة أخرى.");
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("فشل رفع الصورة، برجاء المحاولة مرة أخرى.");
    }

    if (!res.ok || !data.secure_url) {
      throw new Error(data?.error?.message || "فشل رفع الصورة، برجاء المحاولة مرة أخرى.");
    }
    return data.secure_url as string;
  }

  // Fallback: go through our own API route (works for local dev / non-Cloudinary setups).
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: formData });
  } catch {
    throw new Error("تعذّر الاتصال بالإنترنت أثناء رفع الصورة. حاولي مرة أخرى.");
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("الصورة كبيرة جدًا على السيرفر، برجاء اختيار صورة أصغر.");
  }

  if (!res.ok || !data.url) {
    throw new Error(data?.error || "فشل رفع الصورة، برجاء المحاولة مرة أخرى.");
  }
  return data.url as string;
}
