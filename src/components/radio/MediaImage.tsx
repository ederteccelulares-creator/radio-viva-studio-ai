import { useEffect, useState } from "react";
import { resolveMedia } from "@/lib/media";

export function useMediaUrl(ref: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    resolveMedia(ref).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [ref]);
  return url;
}

export function MediaImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const url = useMediaUrl(src);
  if (!url) return <>{fallback ?? null}</>;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}