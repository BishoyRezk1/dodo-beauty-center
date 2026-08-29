import { formatEGP } from "@/lib/utils";

interface Props {
  name: string;
  description?: string | null;
  price: number | string;
  discountPrice?: number | string | null;
  durationMin: number;
  imageUrl?: string | null;
}

export default function ServiceCard({ name, description, price, discountPrice, durationMin, imageUrl }: Props) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div
        className="h-40 w-full bg-gradient-to-br from-blush to-rosegold/40"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-bold text-charcoal">{name}</h3>
        {description && <p className="text-sm text-charcoal/60">{description}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-xs text-charcoal/50">{durationMin} دقيقة</span>
          <div className="flex items-baseline gap-2">
            {discountPrice && (
              <span className="text-xs text-charcoal/40 line-through">{formatEGP(price)}</span>
            )}
            <span className="font-display text-lg font-extrabold text-wine">
              {formatEGP(discountPrice ?? price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
