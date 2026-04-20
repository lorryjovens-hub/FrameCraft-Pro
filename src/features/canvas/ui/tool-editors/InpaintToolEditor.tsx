import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import { UiInput } from '@/components/ui';
import type { ToolOptions } from '@/features/canvas/tools';
import type { VisualToolEditorProps } from './types';

const VIEWPORT_MIN_HEIGHT_PX = 240;

function parsePresetRatio(value: string): number | null {
  if (!value.includes(':')) {
    return null;
  }
  const [rawW, rawH] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW <= 0 || rawH <= 0) {
    return null;
  }
  return rawW / rawH;
}

function parseCustomRatio(value: string): number | null {
  const input = value.trim();
  if (!input) {
    return null;
  }
  if (input.includes(':')) {
    return parsePresetRatio(input);
  }
  const numeric = Number(input);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function toImageSpaceCrop(
  crop: PixelCrop,
  renderedWidth: number,
  renderedHeight: number,
  naturalWidth: number,
  naturalHeight: number
) {
  const scaleX = naturalWidth / renderedWidth;
  const scaleY = naturalHeight / renderedHeight;
  return {
    cropX: Math.round(crop.x * scaleX),
    cropY: Math.round(crop.y * scaleY),
    cropWidth: Math.round(crop.width * scaleX),
    cropHeight: Math.round(crop.height * scaleY),
  };
}

function toRenderedCrop(
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  renderedWidth: number,
  renderedHeight: number,
  naturalWidth: number,
  naturalHeight: number
): Crop {
  const scaleX = renderedWidth / naturalWidth;
  const scaleY = renderedHeight / naturalHeight;
  return {
    unit: 'px',
    x: Math.max(0, cropX * scaleX),
    y: Math.max(0, cropY * scaleY),
    width: Math.max(1, cropWidth * scaleX),
    height: Math.max(1, cropHeight * scaleY),
  };
}

function buildDefaultCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 80,
      },
      1,
      width,
      height
    ),
    width,
    height
  );
}

export interface InpaintToolEditorProps extends VisualToolEditorProps {
  options: ToolOptions;
  onOptionsChange: (next: ToolOptions) => void;
}

export function InpaintToolEditor({
  sourceImageUrl,
  options,
  onOptionsChange,
}: InpaintToolEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousAspectKeyRef = useRef<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [, setIsImageLoaded] = useState(false);

  const displayImageUrl = useMemo(
    () => resolveImageDisplayUrl(sourceImageUrl),
    [sourceImageUrl]
  );

  const aspectRatioKey = String(options.aspectRatio ?? 'free');
  const resolvedAspect = aspectRatioKey === 'free'
    ? undefined
    : aspectRatioKey === 'custom'
      ? parseCustomRatio(String(options.customAspectRatio ?? ''))
      : parsePresetRatio(aspectRatioKey);

  const updateOptions = useCallback(
    (updates: ToolOptions) => {
      onOptionsChange({ ...options, ...updates });
    },
    [options, onOptionsChange]
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setIsImageLoaded(true);

      if (previousAspectKeyRef.current !== aspectRatioKey) {
        previousAspectKeyRef.current = aspectRatioKey;
        setCrop(buildDefaultCrop(width, height));
      } else if (crop && crop.width > 0 && crop.height > 0) {
        setCrop(
          toRenderedCrop(
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            width,
            height,
            width,
            height
          )
        );
      } else {
        setCrop(buildDefaultCrop(width, height));
      }
    },
    [aspectRatioKey, crop]
  );

  const onCropChange = useCallback((newCrop: Crop) => {
    setCrop(newCrop);
  }, []);

  const onCropComplete = useCallback(
    (_crop: PixelCrop) => {
      if (!imageRef.current) {
        return;
      }
      const image = imageRef.current;
      const imageSpaceCrop = toImageSpaceCrop(
        _crop,
        image.clientWidth,
        image.clientHeight,
        image.naturalWidth,
        image.naturalHeight
      );
      updateOptions({
        cropX: imageSpaceCrop.cropX,
        cropY: imageSpaceCrop.cropY,
        cropWidth: imageSpaceCrop.cropWidth,
        cropHeight: imageSpaceCrop.cropHeight,
      });
    },
    [updateOptions]
  );

  useEffect(() => {
    if (!imageRef.current?.complete) {
      return;
    }
    const image = imageRef.current;
    if (previousAspectKeyRef.current !== aspectRatioKey) {
      previousAspectKeyRef.current = aspectRatioKey;
      if (aspectRatioKey !== 'free' && resolvedAspect) {
        setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, resolvedAspect, image.clientWidth, image.clientHeight), image.clientWidth, image.clientHeight));
      } else {
        setCrop(buildDefaultCrop(image.clientWidth, image.clientHeight));
      }
    }
  }, [aspectRatioKey, resolvedAspect]);

  return (
    <div className="flex gap-6">
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-bg-dark"
        style={{ minHeight: VIEWPORT_MIN_HEIGHT_PX }}
      >
        <div className="flex items-center justify-center p-4">
          <div className="relative" style={{ maxWidth: '100%' }}>
            <ReactCrop
              crop={crop}
              onChange={onCropChange}
              onComplete={onCropComplete}
              aspect={resolvedAspect ?? undefined}
              className="max-h-[60vh]"
            >
              <img
                ref={imageRef}
                src={displayImageUrl}
                alt="Source"
                onLoad={onImageLoad}
                className="max-h-[60vh] w-auto object-contain"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-bg-dark/80 px-2 py-1 text-xs text-text-muted">
          绘制要重绘的区域
        </div>
      </div>

      <div className="flex w-64 flex-shrink-0 flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-text-muted">提示词</label>
          <UiInput
            type="text"
            value={String(options.prompt ?? '')}
            onChange={(e) => updateOptions({ prompt: e.target.value })}
            placeholder="描述你想要的内容..."
            className="h-10 w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted">重绘区域比例</label>
          <select
            value={aspectRatioKey}
            onChange={(e) => updateOptions({ aspectRatio: e.target.value })}
            className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/90 px-3 text-sm text-text-dark"
          >
            <option value="free">自由</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        {aspectRatioKey === 'custom' && (
          <div>
            <label className="mb-1 block text-xs text-text-muted">自定义比例 (如 2:3)</label>
            <UiInput
              type="text"
              value={String(options.customAspectRatio ?? '')}
              onChange={(e) => updateOptions({ customAspectRatio: e.target.value })}
              placeholder="2:3"
              className="h-10 w-full"
            />
          </div>
        )}

        {crop && (
          <div className="rounded bg-bg-dark/50 p-2 text-xs text-text-muted">
            <div>选区: {Math.round(crop.width)} × {Math.round(crop.height)}</div>
            <div>位置: ({Math.round(crop.x)}, {Math.round(crop.y)})</div>
          </div>
        )}
      </div>
    </div>
  );
}
