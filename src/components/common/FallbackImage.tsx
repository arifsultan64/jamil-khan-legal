import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { getDriveImageAlternateUrl, getDriveImageRenderUrl } from '../../utils/driveUrls';

interface FallbackImageProps {
  src?: string;
  alt: string;
  className?: string;
  title?: string;
}

export const FallbackImage: React.FC<FallbackImageProps> = ({ src, alt, className = '', title }) => {
  const primarySrc = getDriveImageRenderUrl(src);
  const alternateSrc = getDriveImageAlternateUrl(src);
  const [activeSrc, setActiveSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(getDriveImageRenderUrl(src));
    setFailed(false);
  }, [src]);

  const handleError = () => {
    if (alternateSrc && activeSrc !== alternateSrc) {
      setActiveSrc(alternateSrc);
      return;
    }
    setFailed(true);
  };

  if (!activeSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0F2342] via-[#152E52] to-[#103628] text-white/90 p-6 select-none ${className}`}
      >
        <Scale className="w-8 h-8 text-[#B38D47] mb-2 opacity-90" strokeWidth={1.5} />
        {title && (
          <span className="font-serif text-sm text-center text-white/80 line-clamp-2 max-w-[22ch]">
            {title}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
};
