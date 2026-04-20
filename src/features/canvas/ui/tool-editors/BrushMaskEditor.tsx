import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import type { ToolOptions } from '@/features/canvas/tools';
import { Eraser, Pencil, Undo2 } from 'lucide-react';

const VIEWPORT_MIN_HEIGHT_PX = 240;

export interface BrushMaskEditorProps {
  sourceImageUrl: string;
  options: ToolOptions;
  onOptionsChange: (next: ToolOptions) => void;
}

interface Point {
  x: number;
  y: number;
}

export function BrushMaskEditor({
  sourceImageUrl,
  options,
  onOptionsChange,
}: BrushMaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const maskDataRef = useRef<ImageData | null>(null);

  const [brushSize, setBrushSize] = useState(30);
  const [brushTool, setBrushTool] = useState<'draw' | 'erase'>('draw');
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const displayImageUrl = useMemo(
    () => resolveImageDisplayUrl(sourceImageUrl),
    [sourceImageUrl]
  );

  const updateOptions = useCallback(
    (updates: ToolOptions) => {
      onOptionsChange({ ...options, ...updates });
    },
    [options, onOptionsChange]
  );

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawLine = useCallback(
    (ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number, isErase: boolean) => {
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    []
  );

  const saveToHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const newData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const newHistory = strokeHistory.slice(0, historyIndex + 1);
    newHistory.push(newData);

    if (newHistory.length > 20) {
      newHistory.shift();
    }

    setStrokeHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [strokeHistory, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      setHistoryIndex(-1);
      setStrokeHistory([]);
      return;
    }

    const prevData = strokeHistory[historyIndex - 1];
    if (!prevData) return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(prevData, 0, 0);
    setHistoryIndex(historyIndex - 1);
  }, [historyIndex, strokeHistory]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      if (!point) return;

      isDrawingRef.current = true;
      lastPointRef.current = point;

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.globalCompositeOperation = brushTool === 'erase' ? 'destination-out' : 'source-over';
        ctx.fill();
      }
    },
    [getCanvasPoint, brushSize, brushTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();

      const point = getCanvasPoint(e);
      if (!point || !lastPointRef.current) return;

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        drawLine(ctx, lastPointRef.current, point, brushSize, brushTool === 'erase');
      }

      lastPointRef.current = point;
    },
    [getCanvasPoint, drawLine, brushSize, brushTool]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      saveToHistory();
      syncMaskToCanvas();
    }
  }, [saveToHistory]);

  const syncMaskToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    ctx.drawImage(canvas, 0, 0);
  }, []);

  const getMaskBase64 = useCallback((): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;

    const invertCanvas = document.createElement('canvas');
    invertCanvas.width = maskCanvas.width;
    invertCanvas.height = maskCanvas.height;
    const invertCtx = invertCanvas.getContext('2d');
    if (!invertCtx) return null;

    const invertImageData = invertCtx.createImageData(maskCanvas.width, maskCanvas.height);
    const invertData = invertImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      invertData[i] = 255;
      invertData[i + 1] = 255;
      invertData[i + 2] = 255;
      invertData[i + 3] = alpha;
    }

    invertCtx.putImageData(invertImageData, 0, 0);
    return invertCanvas.toDataURL('image/png');
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        saveToHistory();
        syncMaskToCanvas();
      }
    };

    window.addEventListener('mouseup', handleMouseUpGlobal);
    window.addEventListener('touchend', handleMouseUpGlobal);

    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
      window.removeEventListener('touchend', handleMouseUpGlobal);
    };
  }, [saveToHistory, syncMaskToCanvas]);

  useEffect(() => {
    const maskBase64 = getMaskBase64();
    if (maskBase64) {
      updateOptions({ maskImage: maskBase64 });
    }
  }, [strokeHistory, historyIndex, getMaskBase64, updateOptions]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      const maxRenderWidth = 600;
      const maxRenderHeight = 400;
      let renderWidth = naturalWidth;
      let renderHeight = naturalHeight;

      if (renderWidth > maxRenderWidth) {
        renderHeight = (maxRenderWidth / renderWidth) * renderHeight;
        renderWidth = maxRenderWidth;
      }
      if (renderHeight > maxRenderHeight) {
        renderWidth = (maxRenderHeight / renderHeight) * renderWidth;
        renderHeight = maxRenderHeight;
      }

      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (canvas && maskCanvas) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        maskCanvas.width = renderWidth;
        maskCanvas.height = renderHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, renderWidth, renderHeight);
        }

        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.fillStyle = 'black';
          maskCtx.fillRect(0, 0, renderWidth, renderHeight);
        }

        maskDataRef.current = maskCtx?.getImageData(0, 0, renderWidth, renderHeight) || null;
      }

      setIsImageLoaded(true);
      updateOptions({
        maskWidth: renderWidth,
        maskHeight: renderHeight,
      });
    },
    [updateOptions]
  );

  return (
    <div className="flex gap-6">
      <div
        className="relative flex-1 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-bg-dark"
        style={{ minHeight: VIEWPORT_MIN_HEIGHT_PX }}
      >
        <div className="flex items-center justify-center p-4">
          <div className="relative" style={{ maxWidth: '100%' }}>
            <img
              ref={imageRef}
              src={displayImageUrl}
              alt="Source"
              onLoad={onImageLoad}
              className="max-h-[60vh] w-auto object-contain"
              crossOrigin="anonymous"
            />

            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-auto"
              style={{ maxHeight: '60vh', objectFit: 'contain' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />

            {!isImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-bg-dark/80 px-3 py-1.5 text-xs text-text-muted flex items-center gap-2">
          <Pencil className="h-3 w-3" />
          <span>在图像上绘制要重绘的区域（黑色=重绘，橡皮擦=恢复）</span>
        </div>
      </div>

      <div className="flex w-64 flex-shrink-0 flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-text-muted">提示词</label>
          <textarea
            value={String(options.prompt ?? '')}
            onChange={(e) => updateOptions({ prompt: e.target.value })}
            placeholder="描述你想要的内容..."
            className="h-20 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/90 px-3 py-2 text-sm text-text-dark placeholder:text-text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted">工具</label>
          <div className="flex gap-2">
            <button
              onClick={() => setBrushTool('draw')}
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border transition-colors ${
                brushTool === 'draw'
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-[rgba(255,255,255,0.12)] text-text-muted hover:border-[rgba(255,255,255,0.24)]'
              }`}
            >
              <Pencil className="h-4 w-4" />
              <span className="text-sm">画笔</span>
            </button>
            <button
              onClick={() => setBrushTool('erase')}
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border transition-colors ${
                brushTool === 'erase'
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-[rgba(255,255,255,0.12)] text-text-muted hover:border-[rgba(255,255,255,0.24)]'
              }`}
            >
              <Eraser className="h-4 w-4" />
              <span className="text-sm">橡皮</span>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-muted">
            笔刷大小: {brushSize}px
          </label>
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="h-2 w-full cursor-pointer rounded-lg bg-[rgba(255,255,255,0.1)] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={strokeHistory.length === 0}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 text-text-muted transition-colors hover:border-[rgba(255,255,255,0.24)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="h-4 w-4" />
            <span className="text-sm">撤销</span>
          </button>
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              const maskCanvas = maskCanvasRef.current;
              if (canvas && maskCanvas) {
                const ctx = canvas.getContext('2d');
                const maskCtx = maskCanvas.getContext('2d');
                if (ctx && maskCtx) {
                  ctx.fillStyle = 'black';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  maskCtx.fillStyle = 'black';
                  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                  setStrokeHistory([]);
                  setHistoryIndex(-1);
                  updateOptions({ maskImage: '' });
                }
              }
            }}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/50 text-text-muted transition-colors hover:border-[rgba(255,255,255,0.24)]"
          >
            <span className="text-sm">清除</span>
          </button>
        </div>

        <div className="rounded bg-bg-dark/50 p-3 text-xs text-text-muted">
          <div className="font-medium text-text-dark mb-2">操作提示</div>
          <ul className="space-y-1">
            <li>• 使用画笔在图像上绘制遮罩</li>
            <li>• 黑色区域将被重绘</li>
            <li>• 使用橡皮擦恢复误涂区域</li>
            <li>• 调整笔刷大小获得精细控制</li>
            <li>• 支持撤销（最多20步）</li>
          </ul>
        </div>
      </div>

      <canvas
        ref={maskCanvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}
