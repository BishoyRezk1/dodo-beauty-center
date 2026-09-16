import { getSettings, SETTING_KEYS } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import OffersBanner from "@/components/site/OffersBanner";
import WhatsAppFloatButton from "@/components/site/WhatsAppFloatButton";
import FacebookFloatButton from "@/components/site/FacebookFloatButton";
import TikTokFloatButton from "@/components/site/TikTokFloatButton";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const settings = await getSettings();
  const whatsappHref = buildWhatsAppLink(
    settings[SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER],
    "مرحبًا، أريد الاستفسار عن العروض في Zina Nails"
  );

  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { createdAt: "desc" }
  });

  const serialized = offers.map((o) => ({
    id: o.id,
    title: o.title,
    details: o.details,
    imageUrl: o.imageUrl,
    oldPrice: o.oldPrice.toString(),
    newPrice: o.newPrice.toString(),
    endDate: o.endDate.toISOString(),
    serviceId: o.serviceId
  }));

  return (
    <>
      <Header siteName={settings[SETTING_KEYS.SITE_NAME]} />
      <main>
        <section className="section-container py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold tracking-widest text-rosegold">عروض خاصة</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
              عروض لفترة محدودة
            </h2>
          </div>
          {serialized.length > 0 ? (
            <OffersBanner offers={serialized} />
          ) : (
            <p className="text-center text-charcoal/50">لا توجد عروض متاحة حاليًا</p>
          )}
        </section>
      </main>
      <Footer
        siteName={settings[SETTING_KEYS.SITE_NAME]}
        whatsappHref={whatsappHref}
        instagramUrl={settings[SETTING_KEYS.INSTAGRAM_URL] || undefined}
        facebookUrl={settings[SETTING_KEYS.FACEBOOK_URL] || undefined}
        tiktokUrl={settings[SETTING_KEYS.TIKTOK_URL] || undefined}
      />
      <WhatsAppFloatButton href={whatsappHref} />
      {settings[SETTING_KEYS.FACEBOOK_URL] && (
        <FacebookFloatButton href={settings[SETTING_KEYS.FACEBOOK_URL]} />
      )}
      {settings[SETTING_KEYS.TIKTOK_URL] && (
        <TikTokFloatButton href={settings[SETTING_KEYS.TIKTOK_URL]} />
      )}
    </>
  );
}
