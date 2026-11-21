import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  onError?: () => void;
};

const OPTIMIZABLE = [
  /^\/(?!\/)/,
  /^https:\/\/res\.cloudinary\.com\//,
  /^https:\/\/[^/]+\.supabase\.co\//,
];

export default function SafeImage({ src, alt, fill, width, height, sizes, className, priority, onError }: Props) {
  const ok = OPTIMIZABLE.some((r) => r.test(src));

  if (!ok) {
    const cls = (fill ? "absolute inset-0 h-full w-full " : "") + (className || "");
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className={cls} onError={onError} />;
  }

  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes || "100vw"} className={className} priority={priority} onError={onError} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      sizes={sizes}
      className={className}
      priority={priority}
      onError={onError}
    />
  );
}
