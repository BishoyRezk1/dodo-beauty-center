import { getSettings, SETTING_KEYS } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import ServicesSection from "@/components/site/ServicesSection";
import OffersSection from "@/components/site/OffersSection";
import GallerySection from "@/components/site/GallerySection";
import ReviewsSection from "@/components/site/ReviewsSection";
import LocationSection from "@/components/site/LocationSection";
import Footer from "@/components/site/Footer";
import WhatsAppFloatButton from "@/components/site/WhatsAppFloatButton";

// Always fetch fresh data from the database — without this, Next.js would
// bake the homepage (services, offers, gallery, reviews) into a static
// snapshot at deploy time, so anything added later from the admin
// dashboard wouldn't show up until the next deploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const whatsappHref = buildWhatsAppLink(
    settings[SETTING_KEYS.WHATSAPP_SHOP_LINK_NUMBER],
    "مرحبًا، أريد الاستفسار عن الخدمات في DoDo Beauty Center"
  );

  return (
    <>
      <Header siteName={settings[SETTING_KEYS.SITE_NAME]} />
      <main>
        <Hero
          siteName={settings[SETTING_KEYS.SITE_NAME]}
          tagline={settings[SETTING_KEYS.SITE_TAGLINE]}
          whatsappHref={whatsappHref}
        />
        <ServicesSection />
        <OffersSection />
        <GallerySection />
        <ReviewsSection />
        <LocationSection
          address={settings[SETTING_KEYS.MAP_ADDRESS]}
          mapUrl={settings[SETTING_KEYS.MAP_URL]}
          lat={settings[SETTING_KEYS.MAP_LAT]}
          lng={settings[SETTING_KEYS.MAP_LNG]}
        />
      </main>
      <Footer
        siteName={settings[SETTING_KEYS.SITE_NAME]}
        whatsappHref={whatsappHref}
        instagramUrl={settings[SETTING_KEYS.INSTAGRAM_URL] || undefined}
        facebookUrl={settings[SETTING_KEYS.FACEBOOK_URL] || undefined}
        tiktokUrl={settings[SETTING_KEYS.TIKTOK_URL] || undefined}
      />
      <WhatsAppFloatButton href={whatsappHref} />
    </>
  );
}
