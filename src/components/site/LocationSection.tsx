interface Props {
  address: string;
  mapUrl: string;
  lat: string;
  lng: string;
}

export default function LocationSection({ address, mapUrl, lat, lng }: Props) {
  const embedSrc = `https://www.google.com/maps?q=${lat},${lng}&hl=ar&z=15&output=embed`;

  return (
    <section id="location" className="bg-blush/30 py-16 md:py-24">
      <div className="section-container">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold tracking-widest text-rosegold">موقعنا</span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-charcoal md:text-4xl">
            📍 موقع DoDo Beauty Center
          </h2>
          <p className="mt-2 text-charcoal/60">{address}</p>
        </div>

        <div className="overflow-hidden rounded-xl2 shadow-soft">
          <iframe
            src={embedSrc}
            width="100%"
            height="360"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="موقع DoDo Beauty Center على الخريطة"
          />
        </div>

        <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
          <a href={mapUrl} target="_blank" rel="noreferrer" className="btn-primary">
            فتح الموقع على Google Maps
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`موقعنا: ${mapUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            مشاركة الموقع
          </a>
        </div>
      </div>
    </section>
  );
}
