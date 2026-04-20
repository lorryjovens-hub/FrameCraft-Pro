import { memo, useCallback, useEffect, useRef, useState, type ImgHTMLAttributes, type MouseEvent } from 'react';

import { useCanvasStore } from '@/stores/canvasStore';

export interface CanvasNodeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  viewerSourceUrl?: string | null;
  viewerImageList?: Array<string | null | undefined>;
  disableViewer?: boolean;
  lazy?: boolean;
  placeholderColor?: string;
  placeholderSrc?: string | null;
}

function normalizeViewerList(
  imageList: Array<string | null | undefined> | undefined,
  currentImageUrl: string
): string[] {
  const deduped: string[] = [];
  for (const rawItem of imageList ?? []) {
    const item = typeof rawItem === 'string' ? rawItem.trim() : '';
    if (!item || deduped.includes(item)) {
      continue;
    }
    deduped.push(item);
  }

  if (!deduped.includes(currentImageUrl)) {
    deduped.unshift(currentImageUrl);
  }

  return deduped.length > 0 ? deduped : [currentImageUrl];
}

export const CanvasNodeImage = memo(({
  viewerSourceUrl,
  viewerImageList,
  disableViewer = false,
  lazy = false,
  placeholderColor,
  placeholderSrc,
  onDoubleClick,
  src,
  className,
  style,
  ...props
}: CanvasNodeImageProps) => {
  const openImageViewer = useCanvasStore((state) => state.openImageViewer);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(true);

  const handleDoubleClick = useCallback((event: MouseEvent<HTMLImageElement>) => {
    onDoubleClick?.(event);

    if (event.defaultPrevented || disableViewer) {
      return;
    }

    const fallbackSrc = event.currentTarget.currentSrc || (typeof src === 'string' ? src : '');
    const resolvedSource =
      typeof viewerSourceUrl === 'string' && viewerSourceUrl.trim().length > 0
        ? viewerSourceUrl.trim()
        : fallbackSrc.trim();
    if (!resolvedSource) {
      return;
    }

    event.stopPropagation();
    openImageViewer(resolvedSource, normalizeViewerList(viewerImageList, resolvedSource));
  }, [disableViewer, onDoubleClick, openImageViewer, src, viewerImageList, viewerSourceUrl]);

  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px', threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const resolvedSrc = shouldLoad && typeof src === 'string'
    ? src.trim()
    : null;

  const showPlaceholder = lazy && !isLoaded;
  const hasPlaceholderBlur = placeholderSrc && showPlaceholder;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ backgroundColor: placeholderColor }}>
      {hasPlaceholderBlur && (
        <img
          src={placeholderSrc ?? undefined}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg"
          aria-hidden="true"
        />
      )}
      {showPlaceholder && !hasPlaceholderBlur && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 animate-pulse rounded-full border border-text-muted/30" />
        </div>
      )}
      {shouldLoad && (resolvedSrc || resolvedSrc === '') && (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt=""
          onDoubleClick={handleDoubleClick}
          onLoad={handleLoad}
          className={`h-full w-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''} transition-opacity duration-200`}
          style={style}
          {...props}
        />
      )}
      {!shouldLoad && (
        <div
          className={`h-full w-full ${className ?? ''}`}
          style={style}
          {...props}
        />
      )}
    </div>
  );
});

CanvasNodeImage.displayName = 'CanvasNodeImage';