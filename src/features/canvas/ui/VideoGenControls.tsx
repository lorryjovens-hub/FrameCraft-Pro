import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

import { useCanvasStore } from '@/stores/canvasStore';
import { UiButton, UiPanel } from '@/components/ui';
import { NODE_CONTROL_PRIMARY_BUTTON_CLASS, NODE_CONTROL_ICON_CLASS } from './nodeControlStyles';
import { isVideoGenNode } from '../domain/canvasNodes';

export const VideoGenControls = memo(({ nodeId }: { nodeId: string }) => {
  const { t } = useTranslation();
  const node = useCanvasStore((state) => 
    state.nodes.find((n) => n.id === nodeId)
  );

  if (!node || !isVideoGenNode(node)) {
    return null;
  }
  const enableVideoGenShortcut = true;

  const handleGenerate = async (previewOnly: boolean = false) => {
    // Trigger generate event through canvas event bus
    import('@/features/canvas/application/canvasServices').then(({ canvasEventBus }) => {
      canvasEventBus.publish('video-gen/generate' as any, {
        nodeId: nodeId,
        previewOnly,
      });
    });
  };

  return (
    <UiPanel className="w-full max-w-md p-4 space-y-4">
      {/* Generate Button */}
      <div className="flex justify-center">
        <UiButton
          onClick={(event) => {
            event.stopPropagation();
            const previewOnly =
              enableVideoGenShortcut && event.ctrlKey && event.altKey && event.shiftKey;
            void handleGenerate(previewOnly);
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

VideoGenControls.displayName = 'VideoGenControls';