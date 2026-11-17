import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectClassName?: string;
  priority?: boolean;
}

export function CoverImage({
  src,
  alt,
  className = '',
  aspectClassName = 'aspect-[3/4]',
  priority = false,
}: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const showFallback = !src || failed;

  return (
    <div
      className={`relative overflow-hidden bg-linen border border-rule ${aspectClassName} ${className}`}
    >
      {showFallback ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-linen px-3 text-center text-ink-muted">
          <BookOpen className="h-6 w-6 opacity-50" strokeWidth={1.5} />
          <span className="line-clamp-3 font-serif text-xs leading-snug text-ink-muted">
            {alt}
          </span>
        </div>
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 bg-linen" aria-hidden="true" />}
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
