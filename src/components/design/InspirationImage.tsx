"use client";

import { useCallback, useState, type ReactNode } from "react";

/**
 * A pinned image, cropped to the card. Links go stale (and people paste page links instead of
 * image links), so if it won't load we show the designed placeholder instead of a broken icon.
 * Key it by `src` so a new link gets a fresh try.
 */
export function InspirationImage({ src, alt, fallback }: { src: string; alt: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  // An image can fail before React hydrates and misses the error event; check once on mount.
  const probe = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- links to any site; next/image would need every host allow-listed
    <img
      ref={probe}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}
