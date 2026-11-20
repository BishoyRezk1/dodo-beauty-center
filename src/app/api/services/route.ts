import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { archiveExpiredWeeklyOffer } from "@/lib/weekly-offer";

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
  await archiveExpiredWeeklyOffer();
  const includeInactive = req.nextUrl.searchParams.get("all") === "1";

  const now = new Date();
  const services = await prisma.service.findMany({
    where: includeInactive
      ? {}
      : {
          isActive: true,
          status: "AVAILABLE",
          OR: [
            { category: { not: "weekly-offer" } },
            { offers: { some: { isActive: true, archivedAt: null, startDate: { lte: now }, endDate: { gte: now } } } }
          ]
        },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await req.json();

  if (body?.weeklyOffer === true) {
    const weeklyServices = [
      { name: "مكواة", nameEn: "Flat Iron", slug: "weekly-flat-iron-2026", description: "عرض خاص لمدة أسبوع — السعر من 70 إلى 100 جنيه حسب طول الشعر.", price: 100, discountPrice: 70 },
      { name: "قص أطراف وغسيل", nameEn: "Trim & Wash", slug: "weekly-trim-wash-2026", description: "قص أطراف وغسيل الشعر.", price: 50 },
      { name: "تنظيف بشرة", nameEn: "Facial Cleaning", slug: "weekly-facial-cleaning-2026", description: "تنظيف بشرة.", price: 50 },
      { name: "تنظيف بشرة عميق", nameEn: "Deep Facial Cleaning", slug: "weekly-deep-facial-2026", description: "تنظيف بشرة عميق.", price: 100 },
      { name: "طبقة هارد جيل خفيفة لتقوية شكل الأظافر", nameEn: "Light Hard Gel", slug: "weekly-light-hard-gel-2026", description: "طبقة هارد جيل خفيفة لتقوية شكل الأظافر.", price: 100 },
      { name: "وش وحواجب ودارما + ماسك", nameEn: "Face, Brows, Dermaplaning & Mask", slug: "weekly-face-brows-derma-mask-2026", description: "وش وحواجب ودارما مع ماسك.", price: 80 },
      { name: "باديكير رجل", nameEn: "Foot Pedicure", slug: "weekly-foot-pedicure-2026", description: "باديكير رجل.", price: 100 },
      { name: "فيك نيلز لون واحد", nameEn: "Fake Nails - One Color", slug: "weekly-fake-nails-one-color-2026", description: "فيك نيلز لون واحد.", price: 100 },
      { name: "جيل بولش لون واحد", nameEn: "Gel Polish - One Color", slug: "weekly-gel-polish-one-color-2026", description: "جيل بولش لون واحد.", price: 100 }
    ];
    const startsAt = new Date();
    // 23:59:59.999 in Cairo (UTC+2) on 27 November 2026.
    const endsAt = new Date("2026-11-27T21:59:59.999Z");
    let created = 0;
    for (let index = 0; index < weeklyServices.length; index++) {
      const item = weeklyServices[index];
      let service = await prisma.service.findUnique({ where: { slug: item.slug } });
      if (!service) {
        service = await prisma.service.create({
          data: {
            ...item,
            category: "weekly-offer",
            durationMin: 60,
            bufferMin: 0,
            status: "AVAILABLE",
            isActive: true,
            sortOrder: index
          }
        });
        created++;
      } else if (service.category !== "weekly-offer") {
        // Never take over or modify an existing core service with a colliding slug.
        continue;
      }
      const linkedOffer = await prisma.offer.findFirst({
        where: { serviceId: service.id, title: item.name }
      });
      if (!linkedOffer) {
        await prisma.offer.create({
          data: {
            title: item.name,
            details: item.description,
            oldPrice: item.price,
            newPrice: item.discountPrice ?? item.price,
            startDate: startsAt,
            endDate: endsAt,
            isActive: true,
            serviceId: service.id
          }
        });
      }
    }
    return NextResponse.json({ created, total: weeklyServices.length, endsAt: endsAt.toISOString() }, { status: 201 });
  }

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

  {
    const b = body as Record<string, unknown> | null;
    if (b && typeof b === "object" && !Array.isArray(b)) {
      const slugify = (v: unknown) =>
        typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";
      const given = typeof b.slug === "string" ? b.slug : "";
      if (!(given.length >= 2 && /^[a-z0-9-]+$/.test(given))) {
        let base = slugify(given) || slugify(b.nameEn) || slugify(b.name);
        if (base.length < 2) base = "service";
        let slug = base;
        let n = 0;
        while (await prisma.service.findFirst({ where: { slug }, select: { id: true } })) {
          n++;
          slug = n > 50 ? base + "-" + Date.now().toString(36) : base + "-" + n;
          if (n > 50) break;
        }
        b.slug = slug;
      }
    }
  }

  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const labels: Record<string, string> = {
      name: "الاسم", nameEn: "الاسم بالإنجليزي", slug: "الرابط (slug)", category: "القسم",
      price: "السعر", discountPrice: "سعر الخصم", durationMin: "المدة", bufferMin: "وقت الراحة",
      status: "الحالة", sortOrder: "الترتيب",
    };
    const bad = Object.keys(fe).filter((k) => fe[k] && fe[k]!.length).map((k) => labels[k] || k);
    return NextResponse.json(
      { error: "تحققي من الحقول: " + (bad.join("، ") || "بيانات غير صالحة"), details: parsed.error.flatten() },
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
