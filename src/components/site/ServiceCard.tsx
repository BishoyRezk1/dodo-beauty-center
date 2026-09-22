"use client";

import Link from "next/link";

interface ServiceCardProps {
  id: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  durationMin: number;
  imageUrl?: string | null;
  showComingSoon?: boolean;
  status?: "AVAILABLE" | "COMING_SOON" | "HIDDEN";
}

export default function ServiceCard({
  id,
  name,
  nameEn,
  description,
  price,
  discountPrice,
  durationMin,
  imageUrl,
  showComingSoon = false,
  status = "AVAILABLE",
}: ServiceCardProps) {
  const hasDiscount =
    typeof discountPrice === "number" &&
    discountPrice > 0 &&
    discountPrice < price;

  const card = (
    <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-36 w-full object-cover sm:h-44 md:h-52"
        />
      ) : (
        <div className="flex h-36 items-center justify-center bg-gray-100 text-3xl sm:h-44 sm:text-4xl md:h-52 md:text-5xl">
          💇‍♀️
        </div>
      )}

      <div className="p-3 sm:p-4 md:p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 sm:text-lg md:text-xl">{name}</h3>
            {nameEn && (
              <p className="text-sm text-gray-500" dir="ltr">
                {nameEn}
              </p>
            )}
          </div>

          {status === "COMING_SOON" && (
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              قريبًا
            </span>
          )}
        </div>

        {description && (
          <p className="mb-4 line-clamp-2 text-sm leading-6 text-gray-600">
            {description}
          </p>
        )}

        <div className="mb-4 flex items-center justify-end">
          {status === "COMING_SOON" ? (
            <span className="font-bold text-amber-600">سيتم تحديد السعر</span>
          ) : hasDiscount ? (
            <div className="text-right">
              <span className="mr-2 text-sm text-gray-400 line-through">
                {price} ج.م
              </span>
              <span className="font-bold text-pink-600">
                {discountPrice} ج.م
              </span>
            </div>
          ) : (
            <span className="font-bold text-pink-600">{price} ج.م</span>
          )}
        </div>

        {hasDiscount && status === "AVAILABLE" && (
          <div className="mb-4">
            <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              عرض خاص
            </span>
          </div>
        )}

        {status === "AVAILABLE" ? (
          <div className="rounded-xl bg-pink-600 px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-pink-700 sm:px-4 sm:py-3 sm:text-base">
            احجزي الآن
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 px-3 py-2.5 text-center text-sm font-bold text-gray-500 sm:px-4 sm:py-3 sm:text-base">
            الخدمة ستكون متاحة قريبًا
          </div>
        )}
      </div>
    </div>
  );

  if (status === "AVAILABLE") {
    return (
      <Link href={`/booking?service=${id}`} className="block h-full">
        {card}
      </Link>
    );
  }

  return <div className="h-full">{card}</div>;
}
