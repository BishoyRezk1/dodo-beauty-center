import { z } from "zod";

const url = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/") || v.startsWith("https://"), "رابط الصورة غير صالح");

export const categorySchema = z.object({
  name: z.string().trim().min(2, "اسم التصنيف قصير").max(80),
  slug: z.string().trim().max(80).optional(),
  imageUrl: url.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional()
});
export const categoryPatchSchema = categorySchema.partial();

const productBase = z.object({
  name: z.string().trim().min(2, "اسم المنتج قصير").max(160),
  slug: z.string().trim().max(120).optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  imageUrl: url.nullable().optional(),
  images: z.array(url).max(8).optional(),
  price: z.coerce.number().min(0).max(1000000),
  comparePrice: z.coerce.number().min(0).max(1000000).nullable().optional(),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  lowStockAt: z.coerce.number().int().min(0).max(1000).optional(),
  categoryId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
  isActive: z.boolean().optional()
});

const compareOk = (d: { price?: number; comparePrice?: number | null }) =>
  d.comparePrice == null || d.price == null || d.comparePrice > d.price;
const compareMsg = { message: "السعر قبل الخصم لازم يكون أكبر من السعر الحالي", path: ["comparePrice"] };

export const productSchema = productBase.refine(compareOk, compareMsg);
export const productPatchSchema = productBase.partial().refine(compareOk, compareMsg);
