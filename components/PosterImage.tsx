'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';

interface PosterImageProps {
  src: string;
  alt: string;
  className?: string;
  iconSize?: number;
  priority?: boolean;
  sizes?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

export default function PosterImage({ src, alt, className, iconSize = 28, priority, sizes, referrerPolicy }: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
        <Film className="text-zinc-700" size={iconSize} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      onError={() => setFailed(true)}
    />
  );
}
