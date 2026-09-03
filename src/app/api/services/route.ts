import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  nameEn: z.string().optional().nullable(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  category: z.string().min(2).default("general"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().optional().nullable(),
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0).optional(),
  status: z.enum(["AVAILABLE", "COMING_SOON", "HIDDEN"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

const catalog = [
  ["قص الشعر", "Haircut", "hair"],
  ["تصفيف الشعر", "Hair Styling", "hair"],
  ["استشوار", "Blow Dry", "hair"],
  ["ويفي", "Wavy Hair", "hair"],
  ["تسريحات مناسبات", "Event Hairstyle", "hair"],
  ["صبغة شعر", "Hair Coloring", "hair"],
  ["هايلايت", "Highlights", "hair"],
  ["بالياج", "Balayage", "hair"],
  ["سحب لون", "Color Removal", "hair"],
  ["علاج الشعر", "Hair Treatment", "hair"],
  ["بروتين", "Protein Treatment", "hair"],
  ["كيراتين", "Keratin Treatment", "hair"],
  ["حمام كريم", "Cream Bath", "hair"],
  ["حمام زيت", "Oil Bath", "hair"],
  ["فرد الشعر", "Hair Straightening", "hair"],

  ["جل للشعر", "Hair Gel", "hair-gel"],
  ["تصفيف بالجل", "Gel Styling", "hair-gel"],
  ["تحديد وتصفيف الشعر", "Hair Definition", "hair-gel"],

  ["مانيكير", "Manicure", "nails"],
  ["باديكير", "Pedicure", "nails"],
  ["مانيكير وباديكير", "Manicure & Pedicure", "nails"],
  ["تركيب أظافر", "Nail Extensions", "nails"],
  ["إزالة أظافر", "Nail Removal", "nails"],
  ["Nail Art", "Nail Art", "nails"],
  ["Gel Polish", "Gel Polish", "nails"],
  ["French Nails", "French Nails", "nails"],

  ["تنظيف بشرة", "Facial Treatment", "skin"],
  ["تنظيف بشرة عميق", "Deep Facial", "skin"],
  ["ترطيب البشرة", "Skin Hydration", "skin"],
  ["ديرما بلاننج", "Dermaplaning", "skin"],
  ["ماسك للبشرة", "Face Mask", "skin"],
  ["تقشير البشرة", "Skin Peeling", "skin"],
  ["عناية خاصة بالبشرة", "Advanced Skin Care", "skin"],

  ["مكياج", "Makeup", "makeup"],
  ["مكياج سهرة", "Evening Makeup", "makeup"],
  ["مكياج عروس", "Bridal Makeup", "makeup"],
  ["مكياج مناسبات", "Occasion Makeup", "makeup"],
  ["تركيب رموش", "Eyelashes", "makeup"],

  ["إزالة شعر الوجه", "Facial Hair Removal", "hair-removal"],
  ["إزالة شعر الجسم", "Body Hair Removal", "hair-removal"],
  ["واكس", "Waxing", "hair-removal"],
  ["فتلة", "Threading", "hair-removal"],

  ["عناية باليدين", "Hand Care", "body-care"],
  ["عناية بالقدمين", "Foot Care", "body-care"],

  ["باقة العروس", "Bridal Package", "bridal"],
  ["تجهيز العروس", "Bridal Preparation", "bridal"],
];

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";

  const services = await prisma.service.findMany({
    where: includeInactive
      ? {}
      : {
          isActive: true,
          status: "AVAILABLE"
        },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();

  if (body?.catalog === true) {
    const existing = await prisma.service.findMany({
      select: { slug: true }
    });

    const existingSlugs = new Set(existing.map((s) => s.slug));

    const created = [];

    for (let i = 0; i < catalog.length; i++) {
      const [name, nameEn, category] = catalog[i];
      const slug = `${String(category)}-${String(nameEn)}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (existingSlugs.has(slug)) continue;

      const service = await prisma.service.create({
        data: {
          name: String(name),
          nameEn: String(nameEn),
          slug,
          category: String(category),
          description: null,
          price: 0,
          discountPrice: null,
          durationMin: 60,
          bufferMin: 0,
          status: "COMING_SOON",
          isActive: true,
          sortOrder: i
        }
      });

      created.push(service);
    }

    return NextResponse.json({
      created: created.length,
      services: created
    }, { status: 201 });
  }

  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      status: parsed.data.status ?? "AVAILABLE"
    }
  });

  return NextResponse.json(service, { status: 201 });
}
