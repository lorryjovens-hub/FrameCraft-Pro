  import { memo, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/stores/canvasStore';
import { isUploadNode, isImageEditNode, isExportImageNode, type CanvasNode, type ReferenceImage } from '@/features/canvas/domain/canvasNodes';

interface ReferenceImageSelectorProps {
  referenceImages: ReferenceImage[];
  onChange: (referenceImages: ReferenceImage[]) => void;
  maxReferences?: number;
}

interface ImageNodeOption {
  nodeId: string;
  displayName: string;
  imageUrl: string;
}

function nodeHasImage(node: CanvasNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (isUploadNode(node) || isImageEditNode(node) || isExportImageNode(node)) {
    return Boolean(node.data.imageUrl);
  }

  return false;
}

export const ReferenceImageSelector = memo(({
  referenceImages,
  onChange,
  maxReferences = 5,
}: ReferenceImageSelectorProps) => {
  const { t } = useTranslation();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const allNodes = useCanvasStore((state) => state.nodes);

  const availableImageNodes: ImageNodeOption[] = allNodes
    .filter((node) => {
      if (!isUploadNode(node) && !isImageEditNode(node) && !isExportImageNode(node)) {
        return false;
      }
      return nodeHasImage(node);
    })
    .map((node) => ({
      nodeId: node.id,
      displayName: node.data.displayName || `Node ${node.id.slice(0, 8)}`,
      imageUrl: node.data.imageUrl as string,
    }));

  const handleAddReference = useCallback((node: ImageNodeOption) => {
    if (referenceImages.length >= maxReferences) {
      return;
    }
    const newRef: ReferenceImage = {
      nodeId: node.nodeId,
      imageUrl: node.imageUrl,
      weight: 1.0,
    };
    onChange([...referenceImages, newRef]);
    setIsPickerOpen(false);
  }, [referenceImages, maxReferences, onChange]);

  const handleRemoveReference = useCallback((nodeId: string) => {
    onChange(referenceImages.filter((ref) => ref.nodeId !== nodeId));
  }, [referenceImages, onChange]);

  const handleWeightChange = useCallback((nodeId: string, weight: number) => {
    onChange(
      referenceImages.map((ref) =>
        ref.nodeId === nodeId ? { ...ref, weight: Math.max(0.1, Math.min(2.0, weight)) } : ref
      )
    );
  }, [referenceImages, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {t('node.referenceImage.title')}
        </span>
        <span className="text-xs text-text-muted">
          {referenceImages.length}/{maxReferences}
        </span>
      </div>

      {referenceImages.length > 0 && (
        <div className="space-y-2">
          {referenceImages.map((ref, index) => (
            <div
              key={ref.nodeId}
              className="flex items-center gap-2 rounded-lg border border-border-dark bg-bg-dark p-2"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-md">
                <img
                  src={ref.imageUrl}
                  alt={`Reference ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="truncate text-xs text-text-dark">
                  {t('node.referenceImage.refIndex', { index: index + 1 })}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={ref.weight}
                    onChange={(e) => handleWeightChange(ref.nodeId, parseFloat(e.target.value))}
                    className="h-1 flex-1 appearance-none rounded-full bg-bg-darker"
                  />
                  <span className="w-8 text-right text-xs text-text-muted">
                    {ref.weight.toFixed(1)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveReference(ref.nodeId)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-500/20 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {referenceImages.length < maxReferences && (
        <button
          type="button"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border-dark bg-bg-dark/50 py-2 text-xs text-text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Plus className="h-3 w-3" />
          {t('node.referenceImage.addReference')}
        </button>
      )}

      {isPickerOpen && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border-dark bg-bg-darker p-2">
          {availableImageNodes.length === 0 ? (
            <p className="py-2 text-center text-xs text-text-muted">
              {t('node.referenceImage.noImageNodes')}
            </p>
          ) : (
            <div className="space-y-1">
              {availableImageNodes
                .filter((node) => !referenceImages.some((ref) => ref.nodeId === node.nodeId))
                .map((node) => (
                  <button
                    key={node.nodeId}
                    type="button"
                    onClick={() => handleAddReference(node)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-dark"
                  >
                    <div className="h-6 w-6 overflow-hidden rounded">
                      <img
                        src={node.imageUrl}
                        alt={node.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="truncate text-xs text-text-dark">{node.displayName}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ReferenceImageSelector.displayName = 'ReferenceImageSelector';