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
    { name: "Manicure & Pedicure", slug: "manicure-pedicure", price: 250, durationMin: 60, description: "عناية كاملة بالأظافر" }
  ];
  for (const [i, s] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
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
