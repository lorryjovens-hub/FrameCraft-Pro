import { memo, useEffect, useRef, useState, useCallback } from 'react';

export interface LazyImageProps {
  src: string | null | undefined;
  placeholderSrc?: string | null;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  intersectionMargin?: number;
}

export const LazyImage = memo(function LazyImage({
  src,
  placeholderSrc,
  className,
  alt,
  style,
  onLoad,
  onError,
  intersectionMargin = 200,
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      {
        rootMargin: `${intersectionMargin}px`,
        threshold: 0,
      }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [intersectionMargin]);

  useEffect(() => {
    if (!isInView || !src) {
      if (placeholderSrc) {
        setCurrentSrc(placeholderSrc);
      }
      return;
    }

    setCurrentSrc(src);
    setIsLoaded(false);
    setHasError(false);

    const img = new Image();
    img.src = src;
    img.onload = handleLoad;
    img.onerror = handleError;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, placeholderSrc, handleLoad, handleError]);

  const showBlurPlaceholder = !isLoaded && !hasError && placeholderSrc && currentSrc === placeholderSrc;

  return (
    <div ref={containerRef} className={className} style={style}>
      {showBlurPlaceholder && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-sm scale-105"
          aria-hidden="true"
        />
      )}
      {isInView && src && !hasError && (
        <img
          ref={imgRef}
          src={currentSrc ?? src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className ?? ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          style={style}
        />
      )}
      {!isInView && placeholderSrc && (
        <img
          ref={imgRef}
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-sm scale-105"
          aria-hidden="true"
        />
      )}
      {hasError && (
        <div className="flex h-full w-full items-center justify-center bg-bg-dark text-text-muted text-xs">
          {alt ?? '加载失败'}
        </div>
      )}
    </div>
  );
});