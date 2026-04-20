import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Video, Sparkles } from 'lucide-react';

import { useCanvasStore } from '@/stores/canvasStore';
import { UiButton, UiPanel } from '@/components/ui';
import { NODE_CONTROL_PRIMARY_BUTTON_CLASS, NODE_CONTROL_ICON_CLASS } from './nodeControlStyles';
import { isStoryboardGenNode } from '../domain/canvasNodes';

export const StoryboardGenControls = memo(({ nodeId }: { nodeId: string }) => {
  const { t } = useTranslation();
  const node = useCanvasStore((state) => 
    state.nodes.find((n) => n.id === nodeId)
  );
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  if (!node || !isStoryboardGenNode(node)) {
    return null;
  }

  const nodeData = node.data;
  const mediaType = nodeData.mediaType || 'image';
  const enableStoryboardGenGridPreviewShortcut = true;

  const handleGenerate = async (previewGridOnly: boolean = false) => {
    // Trigger generate event through canvas event bus
    import('@/features/canvas/application/canvasServices').then(({ canvasEventBus }) => {
      canvasEventBus.publish('storyboard-gen/generate' as any, {
        nodeId: nodeId,
        previewGridOnly,
      });
    });
  };

  const handleMediaTypeChange = (type: 'image' | 'video') => {
    updateNodeData(nodeId, { mediaType: type });
  };



  return (
    <UiPanel className="w-full max-w-md p-4 space-y-4">
      {/* Media Type Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
            mediaType === 'image'
              ? 'bg-accent/18 text-text-dark border border-accent/55'
              : 'bg-bg-dark/70 text-text-muted border border-[rgba(255,255,255,0.18)] hover:bg-bg-dark'
          }`}
          onClick={() => handleMediaTypeChange('image')}
        >
          <Image className="h-4 w-4" />
          {t('node.storyboardGen.mediaTypeImage')}
        </button>
        <button
          type="button"
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
            mediaType === 'video'
              ? 'bg-accent/18 text-text-dark border border-accent/55'
              : 'bg-bg-dark/70 text-text-muted border border-[rgba(255,255,255,0.18)] hover:bg-bg-dark'
          }`}
          onClick={() => handleMediaTypeChange('video')}
        >
          <Video className="h-4 w-4" />
          {t('node.storyboardGen.mediaTypeVideo')}
        </button>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <UiButton
          onClick={(event) => {
            event.stopPropagation();
            const previewGridOnly =
              enableStoryboardGenGridPreviewShortcut && event.ctrlKey && event.altKey && event.shiftKey;
            void handleGenerate(previewGridOnly);
          }}
          variant="primary"
          size="sm"
          className={`flex items-center gap-1 ${NODE_CONTROL_PRIMARY_BUTTON_CLASS}`}
        >
          <Sparkles className={NODE_CONTROL_ICON_CLASS} strokeWidth={2.8} />
          {t('canvas.generate')}
        </UiButton>
      </div>
    </UiPanel>
  );
});

StoryboardGenControls.displayName = 'StoryboardGenControls';