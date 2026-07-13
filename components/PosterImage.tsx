'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { Film } from 'lucide-react';

interface PosterImageProps extends Omit<ImageProps, 'onError' | 'src' | 'fill'> {
  src: string;
  iconSize?: number;
}

// Movie posters/thumbnails from the upstream CDN 404 fairly often. Falls back
// to a themed placeholder instead of a broken-image icon (or skipping the
// network fallback entirely when there's no src at all).
export default function PosterImage({ src, alt, className, iconSize = 28, ...rest }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
        <Film className="text-zinc-700" size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
