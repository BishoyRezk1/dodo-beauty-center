import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Image storage abstraction.
 *
 * - If CLOUDINARY_* env vars are set, uploads go to Cloudinary (recommended
 *   for Vercel, since the filesystem there is read-only/ephemeral).
 * - If SUPABASE_* env vars are set, uploads go to Supabase Storage.
 * - Otherwise, falls back to writing into /public/uploads for local
 *   development only. This fallback will NOT persist on Vercel — configure
 *   Cloudinary or Supabase before going to production.
 */

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("صيغة الملف غير مدعومة. الرجاء رفع صورة JPG أو PNG أو WEBP.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("حجم الملف كبير جدًا. الحد الأقصى 5 ميجابايت.");
  }
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  validateImageFile(file);

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return uploadToCloudinary(file, folder);
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return uploadToSupabase(file, folder);
  }
  return uploadLocally(file, folder);
}

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const timestamp = Math.round(Date.now() / 1000);
  // Unsigned preset is simplest to wire up from the dashboard; if you prefer
  // signed uploads, generate the signature here with CLOUDINARY_API_SECRET.
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: dataUri,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET ?? "dodo_unsigned",
        folder,
        timestamp
      })
    }
  );
  if (!res.ok) throw new Error("فشل رفع الصورة إلى Cloudinary");
  const data = await res.json();
  return data.secure_url as string;
}

async function uploadToSupabase(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const res = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.SUPABASE_BUCKET}/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type
      },
      body: Buffer.from(arrayBuffer)
    }
  );
  if (!res.ok) throw new Error("فشل رفع الصورة إلى Supabase");
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${fileName}`;
}

async function uploadLocally(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(path.join(dir, fileName), Buffer.from(arrayBuffer));
  return `/uploads/${folder}/${fileName}`;
}
