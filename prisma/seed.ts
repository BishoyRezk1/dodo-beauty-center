import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SETTING_KEYS } from "../src/lib/settings";

const prisma = new PrismaClient();

async function main() {
  // ---- Admin user ----
  const email = (process.env.ADMIN_EMAIL || "admin@dodobeauty.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { name: "DoDo", email, passwordHash, role: "OWNER" }
  });

  // ---- Settings ----
  const defaultSettings: Record<string, string> = {
    [SETTING_KEYS.SITE_NAME]: "DoDo Beauty Center",
    [SETTING_KEYS.SITE_TAGLINE]: "جمالك يستحق لمسة راقية",
    [SETTING_KEYS.PRIMARY_COLOR]: "#7A3B47",
    [SETTING_KEYS.VODAFONE_NUMBER]: "01000000000",
    [SETTING_KEYS.FEE_TYPE]: "FIXED",
    [SETTING_KEYS.FEE_VALUE]: "100",
    [SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER]: "201000000000",
    [SETTING_KEYS.MAP_ADDRESS]: "القاهرة، مصر",
    [SETTING_KEYS.MAP_LAT]: "30.0444",
    [SETTING_KEYS.MAP_LNG]: "31.2357",
    [SETTING_KEYS.MAP_URL]: "https://maps.google.com",
    [SETTING_KEYS.MAX_CONCURRENT_BOOKINGS]: "1"
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // ---- Working hours (Sat–Thu open, Friday closed — adjust as needed) ----
  const hours = [
    { dayOfWeek: 0, isOpen: true }, // Sunday
    { dayOfWeek: 1, isOpen: true }, // Monday
    { dayOfWeek: 2, isOpen: true }, // Tuesday
    { dayOfWeek: 3, isOpen: true }, // Wednesday
    { dayOfWeek: 4, isOpen: true }, // Thursday
    { dayOfWeek: 5, isOpen: false }, // Friday
    { dayOfWeek: 6, isOpen: true } // Saturday
  ];
  for (const h of hours) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: { isOpen: h.isOpen },
      create: { dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: "10:00", endTime: "22:00" }
    });
  }

  // ---- Services ----
  const services = [
    { name: "Hair Styling", slug: "hair-styling", price: 300, durationMin: 60, description: "تصفيف شعر احترافي يناسب جميع المناسبات" },
    { name: "Hair Coloring", slug: "hair-coloring", price: 800, discountPrice: 650, durationMin: 120, description: "صبغة شعر بأحدث الألوان العالمية" },
    { name: "Facial Treatment", slug: "facial-treatment", price: 450, durationMin: 60, description: "تنظيف بشرة عميق وترطيب" },
    { name: "Makeup", slug: "makeup", price: 500, durationMin: 90, description: "مكياج سهرة أو مناسبات" },
    { name: "Manicure & Pedicure", nameEn: "Manicure & Pedicure", slug: "manicure-pedicure", price: 250, durationMin: 60, description: "عناية كاملة بالأظافر", category: "nails", status: "AVAILABLE" },

    // ---- Hard Gel ----
    { name: "جيل بولش", nameEn: "Gel Polish", slug: "gel-polish", imageUrl: "/service-images/01_gel_polish.jpg", price: 150, durationMin: 60, description: "جيل بولش شامل لون سادة وإضافتين تصميم", category: "hard-gel", status: "AVAILABLE" },
    { name: "تريتمنت", nameEn: "Treatment", slug: "treatment", imageUrl: "/service-images/02_treatment.jpg", price: 200, durationMin: 60, description: "تريتمنت للأظافر", category: "hard-gel", status: "AVAILABLE" },
    { name: "هارد جيل", nameEn: "Hard Gel", slug: "hard-gel", imageUrl: "/service-images/03_hard_gel.jpg", price: 250, durationMin: 90, description: "هارد جيل شامل لون سادة وإضافتين تصميم", category: "hard-gel", status: "AVAILABLE" },
    { name: "هاف جيل", nameEn: "Half Gel", slug: "half-gel", imageUrl: "/service-images/04_half_gel.jpg", price: 220, durationMin: 90, description: "هاف جيل شامل لون سادة وإضافتين تصميم", category: "hard-gel", status: "AVAILABLE" },
    { name: "ريبيل هارد", nameEn: "Rebel Hard", slug: "rebel-hard", imageUrl: "/service-images/05_hard_refill.jpg", price: 220, durationMin: 90, description: "ريبيل هارد شامل لون سادة وإضافتين تصميم", category: "hard-gel", status: "AVAILABLE" },
    { name: "فيك نيلز", nameEn: "Fake Nails", slug: "fake-nails", imageUrl: "/service-images/06_fake_nails.jpg", price: 150, durationMin: 60, description: "فيك نيلز والتصميم حسب الاختيار", category: "hard-gel", status: "AVAILABLE" },
    { name: "فرينش", nameEn: "French", slug: "french", imageUrl: "/service-images/07_french.jpg", price: 30, durationMin: 20, description: "إضافة فرينش", category: "hard-gel", status: "AVAILABLE" },
    { name: "أوبرلي", nameEn: "Ombre", slug: "ombre", imageUrl: "/service-images/08_ombre.jpg", price: 30, durationMin: 20, description: "إضافة أومبري", category: "hard-gel", status: "AVAILABLE" },
    { name: "كات آي", nameEn: "Cat Eye", slug: "cat-eye", imageUrl: "/service-images/09_cat_eye.jpg", price: 30, durationMin: 20, description: "إضافة كات آي", category: "hard-gel", status: "AVAILABLE" },
    { name: "ميرور", nameEn: "Mirror", slug: "mirror", imageUrl: "/service-images/10_mirror.jpg", price: 30, durationMin: 20, description: "إضافة ميرور", category: "hard-gel", status: "AVAILABLE" },
    { name: "تصليح ضافر", nameEn: "Nail Repair", slug: "nail-repair", imageUrl: "/service-images/11_nail_repair.jpg", price: 30, durationMin: 20, description: "تصليح ضافر", category: "hard-gel", status: "AVAILABLE" },
    { name: "إكستنشن", nameEn: "Extension", slug: "extension", imageUrl: "/service-images/12_extension.jpg", price: 10, durationMin: 15, description: "إضافة إكستنشن", category: "hard-gel", status: "AVAILABLE" },
    { name: "إزالة شغل مش شغلي", nameEn: "Remove Other Work", slug: "remove-other-work", imageUrl: "/service-images/13_remove_not_ours.jpg", price: 50, durationMin: 30, description: "إزالة شغل مش شغلي", category: "hard-gel", status: "AVAILABLE" }
  ];

  for (const [i, s] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        nameEn: s.nameEn ?? null,
        price: s.price,
        durationMin: s.durationMin,
        description: s.description,
        imageUrl: s.imageUrl ?? null,
        category: s.category ?? "general",
        status: s.status ?? "AVAILABLE",
        isActive: true,
        sortOrder: i
      },
      create: { ...s, sortOrder: i, isActive: true }
    });
  }

  // ---- Offer ----
  const hairColoring = await prisma.service.findUnique({ where: { slug: "hair-coloring" } });
  await prisma.offer.upsert({
    where: { id: "seed-offer-1" },
    update: {},
    create: {
      id: "seed-offer-1",
      title: "عرض صبغة الشعر",
      details: "خصم خاص على خدمة صبغة الشعر لفترة محدودة",
      oldPrice: 800,
      newPrice: 650,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      serviceId: hairColoring?.id
    }
  });

  console.log("✅ Seed complete.");
  console.log(`   Admin login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
