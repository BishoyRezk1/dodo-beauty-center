import { getSettings, SETTING_KEYS } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import ServicesSection from "@/components/site/ServicesSection";
import OffersSection from "@/components/site/OffersSection";
import ReviewsSection from "@/components/site/ReviewsSection";
import LocationSection from "@/components/site/LocationSection";
import Footer from "@/components/site/Footer";
import WhatsAppFloatButton from "@/components/site/WhatsAppFloatButton";

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
        <ReviewsSection />
        <LocationSection
          address={settings[SETTING_KEYS.MAP_ADDRESS]}
          mapUrl={settings[SETTING_KEYS.MAP_URL]}
          lat={settings[SETTING_KEYS.MAP_LAT]}
          lng={settings[SETTING_KEYS.MAP_LNG]}
        />
      </main>
      <Footer siteName={settings[SETTING_KEYS.SITE_NAME]} whatsappHref={whatsappHref} />
      <WhatsAppFloatButton href={whatsappHref} />
    </>
  );
}
