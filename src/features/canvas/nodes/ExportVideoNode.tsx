import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCanvasStore } from '@/stores/canvasStore';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import type { ExportVideoNodeData } from '@/features/canvas/domain/canvasNodes';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { Video } from 'lucide-react';

type ExportVideoNodeProps = {
  id: string;
  data: ExportVideoNodeData;
};

export const ExportVideoNode = memo(({ id, data }: ExportVideoNodeProps) => {
  const { t } = useTranslation();
  const { setSelectedNode } = useCanvasStore();
  const [, setNow] = useState(() => Date.now());

  const {
    videoUrl,
    previewVideoUrl,
    aspectRatio,
    duration,
    model,
    isGenerating,
    generationStartedAt,
    generationDurationMs,
    generationError,
  } = data;

  const displayUrl = useMemo(() => {
    if (previewVideoUrl) return previewVideoUrl;
    if (videoUrl) return videoUrl;
    return null;
  }, [previewVideoUrl, videoUrl]);

  const resolvedUrl = useMemo(
    () => (displayUrl ? resolveImageDisplayUrl(displayUrl) : null),
    [displayUrl]
  );

  useMemo(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const progress = useMemo(() => {
    if (!isGenerating || generationStartedAt == null) return 0;
    const startedAt = generationStartedAt;
    const dur = Math.max(1000, generationDurationMs ?? 300000);
    const elapsed = Math.max(0, Date.now() - startedAt);
    return Math.min(elapsed / dur, 0.96);
  }, [isGenerating, generationStartedAt, generationDurationMs]);

  const remainingText = useMemo(() => {
    if (!isGenerating || generationStartedAt == null) return '';
    const elapsed = Math.max(0, Date.now() - generationStartedAt);
    const remainingMs = Math.max(0, (generationDurationMs ?? 300000) - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);
    if (remainingSec >= 60) {
      return `${Math.floor(remainingSec / 60)}分${remainingSec % 60}秒`;
    }
    return `${remainingSec}秒`;
  }, [isGenerating, generationStartedAt, generationDurationMs]);

  const handleClick = useCallback(() => {
    setSelectedNode(id);
  }, [id, setSelectedNode]);

  const effectiveAspectRatio = aspectRatio ?? '16:9';

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-bg-dark/95 shadow-xl backdrop-blur-sm"
      onClick={handleClick}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        titleText={t('node.exportVideo.title')}
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-bg-dark">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="relative">
              <Video className="h-12 w-12 text-accent/60" />
              <div
                className="absolute inset-0 animate-ping rounded-full bg-accent/20"
                style={{ animationDuration: '2s' }}
              />
            </div>
            <div className="text-sm text-text-muted">
              {t('node.exportVideo.generating', { duration: duration ?? '5' })}
            </div>
            {isGenerating && (
              <div className="w-32 rounded-full bg-surface-dark">
                <div
                  className="h-1.5 rounded-full bg-accent transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
            {isGenerating && remainingText && (
              <div className="text-xs text-text-muted">
                {remainingText}
              </div>
            )}
          </div>
        ) : generationError ? (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Video className="h-12 w-12 text-red-500/60" />
            <div className="text-sm text-red-400">{generationError}</div>
          </div>
        ) : resolvedUrl ? (
          <video
            src={resolvedUrl}
            controls
            className="max-h-full max-w-full object-contain"
            style={{ aspectRatio: effectiveAspectRatio }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Video className="h-12 w-12 text-text-muted/40" />
            <div className="text-sm text-text-muted">
              {t('node.exportVideo.noVideo')}
            </div>
          </div>
        )}
      </div>

      {(videoUrl || model) && !isGenerating && (
        <div className="flex shrink-0 items-center justify-between border-t border-[rgba(255,255,255,0.08)] bg-bg-dark/80 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Video className="h-3.5 w-3.5" />
            <span>{model || 'Video'}</span>
          </div>
          {duration && (
            <div className="text-xs text-text-muted">
              {duration}s
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ExportVideoNode.displayName = 'ExportVideoNode';