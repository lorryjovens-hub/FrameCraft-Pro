import { memo, useMemo, useState, useCallback } from 'react';

import { useCanvasStore } from '@/stores/canvasStore';
import { isGroupNode, isStoryboardGenNode, isVideoGenNode } from '@/features/canvas/domain/canvasNodes';
import { NodeActionToolbar } from './NodeActionToolbar';
import { NodeGroupTemplateDialog } from './NodeGroupTemplateDialog';
import { StoryboardGenControls } from './StoryboardGenControls';
import { VideoGenControls } from './VideoGenControls';

export const SelectedNodeOverlay = memo(() => {
  const nodes = useCanvasStore((state) => state.nodes);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const [templateSaveGroupNodeId, setTemplateSaveGroupNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const handleOpenTemplateSave = useCallback((groupNodeId: string) => {
    setTemplateSaveGroupNodeId(groupNodeId);
  }, []);

  const handleCloseTemplateSave = useCallback(() => {
    setTemplateSaveGroupNodeId(null);
  }, []);

  if (!selectedNode) {
    return null;
  }

  return (
    <>
      <NodeActionToolbar
        node={selectedNode}
        onOpenTemplateSave={isGroupNode(selectedNode) ? handleOpenTemplateSave : undefined}
      />
      {isStoryboardGenNode(selectedNode) && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <StoryboardGenControls nodeId={selectedNode.id} />
        </div>
      )}
      {isVideoGenNode(selectedNode) && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <VideoGenControls nodeId={selectedNode.id} />
        </div>
      )}
      <NodeGroupTemplateDialog
        isOpen={templateSaveGroupNodeId !== null}
        groupNodeId={templateSaveGroupNodeId}
        onClose={handleCloseTemplateSave}
      />
    </>
  );
});

SelectedNodeOverlay.displayName = 'SelectedNodeOverlay';