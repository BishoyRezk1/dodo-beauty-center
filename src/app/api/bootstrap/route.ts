import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const results: string[] = [];

  const email = (process.env.ADMIN_EMAIL || "admin@dodobeauty.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: { name: "DoDo", email, passwordHash, role: "OWNER" }
    });
    results.push(`admin created: ${email}`);
  } else {
    results.push(`admin already exists: ${email}`);
  }

  const defaultSettings: Record<string, string> = {
    [SETTING_KEYS.SITE_NAME]: "DoDo Beauty Center",
    [SETTING_KEYS.SITE_TAGLINE]: "جمالك يستحق لمسة راقية",
    [SETTING_KEYS.PRIMARY_COLOR]: "#E91E63",
    [SETTING_KEYS.VODAFONE_NUMBER]: "01000000000",
    [SETTING_KEYS.FEE_TYPE]: "FIXED",
    [SETTING_KEYS.FEE_VALUE]: "100",
    [SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER]: process.env.WHATSAPP_SHOP_NUMBER || "201000000000",
    [SETTING_KEYS.MAP_ADDRESS]: "القاهرة، مصر",
    [SETTING_KEYS.MAP_LAT]: "30.0444",
    [SETTING_KEYS.MAP_LNG]: "31.2357",
    [SETTING_KEYS.MAP_URL]: "https://maps.google.com",
    [SETTING_KEYS.MAX_CONCURRENT_BOOKINGS]: "1"
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({ where: { key: k }, update: {}, create: { key: k, value: v } });
  }
  results.push("settings ready");

  const hours = [
    { dayOfWeek: 0, isOpen: true },
    { dayOfWeek: 1, isOpen: true },
    { dayOfWeek: 2, isOpen: true },
    { dayOfWeek: 3, isOpen: true },
    { dayOfWeek: 4, isOpen: true },
    { dayOfWeek: 5, isOpen: false },
    { dayOfWeek: 6, isOpen: true }
  ];
  for (const h of hours) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: {},
      create: { dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: "10:00", endTime: "22:00" }
    });
  }
  results.push("working hours ready");

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
  results.push("demo services ready");

  return NextResponse.json({ ok: true, results, adminEmail: email });
}
