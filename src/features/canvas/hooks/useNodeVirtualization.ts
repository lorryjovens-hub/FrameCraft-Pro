import { useMemo, useRef, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { DEFAULT_NODE_WIDTH } from '@/features/canvas/domain/canvasNodes';

const VIRTUALIZATION_THRESHOLD = 100;
const VIEWPORT_MARGIN = 200;

interface NodeVisibilityState {
  isVirtualized: boolean;
  totalNodes: number;
  visibleNodeCount: number;
  hiddenNodeCount: number;
}

interface VirtualizedNode extends Node {
  isOutsideViewport: boolean;
}

export function useNodeVirtualization() {
  const nodes = useCanvasStore((state) => state.nodes);
  const currentViewport = useCanvasStore((state) => state.currentViewport);
  const viewportRef = useRef(currentViewport);
  viewportRef.current = currentViewport;

  const isVirtualizationEnabled = useMemo(() => {
    return nodes.length > VIRTUALIZATION_THRESHOLD;
  }, [nodes.length]);

  const viewportBounds = useMemo(() => {
    const v = viewportRef.current;
    const viewportWidth = window.innerWidth / (v.zoom || 1);
    const viewportHeight = window.innerHeight / (v.zoom || 1);

    return {
      left: v.x - VIEWPORT_MARGIN,
      right: v.x + viewportWidth + VIEWPORT_MARGIN,
      top: v.y - VIEWPORT_MARGIN,
      bottom: v.y + viewportHeight + VIEWPORT_MARGIN,
    };
  }, [currentViewport]);

  const nodeVisibility = useMemo((): NodeVisibilityState => {
    if (!isVirtualizationEnabled) {
      return {
        isVirtualized: false,
        totalNodes: nodes.length,
        visibleNodeCount: nodes.length,
        hiddenNodeCount: 0,
      };
    }

    let visibleCount = 0;
    for (const node of nodes) {
      const nodeRight = node.position.x + (node.measured?.width ?? DEFAULT_NODE_WIDTH);
      const nodeBottom = node.position.y + (node.measured?.height ?? 200);

      if (
        nodeRight >= viewportBounds.left &&
        node.position.x <= viewportBounds.right &&
        nodeBottom >= viewportBounds.top &&
        node.position.y <= viewportBounds.bottom
      ) {
        visibleCount++;
      }
    }

    return {
      isVirtualized: true,
      totalNodes: nodes.length,
      visibleNodeCount: visibleCount,
      hiddenNodeCount: nodes.length - visibleCount,
    };
  }, [nodes, viewportBounds, isVirtualizationEnabled]);

  const getVirtualizedNodes = useCallback((): VirtualizedNode[] => {
    if (!isVirtualizationEnabled) {
      return nodes.map((node) => ({ ...node, isOutsideViewport: false }));
    }

    return nodes.map((node) => {
      const nodeRight = node.position.x + (node.measured?.width ?? DEFAULT_NODE_WIDTH);
      const nodeBottom = node.position.y + (node.measured?.height ?? 200);

      const isOutside =
        nodeRight < viewportBounds.left ||
        node.position.x > viewportBounds.right ||
        nodeBottom < viewportBounds.top ||
        node.position.y > viewportBounds.bottom;

      return { ...node, isOutsideViewport: isOutside };
    });
  }, [nodes, viewportBounds, isVirtualizationEnabled]);

  return {
    isVirtualizationEnabled,
    nodeVisibility,
    getVirtualizedNodes,
    viewportBounds,
  };
}

export function useViewportCulling() {
  const nodes = useCanvasStore((state) => state.nodes);
  const currentViewport = useCanvasStore((state) => state.currentViewport);

  const culledNodes = useMemo(() => {
    if (nodes.length < VIRTUALIZATION_THRESHOLD) {
      return nodes;
    }

    const zoom = currentViewport.zoom || 1;
    const viewportWidth = window.innerWidth / zoom;
    const viewportHeight = window.innerHeight / zoom;

    const bounds = {
      left: -currentViewport.x - VIEWPORT_MARGIN,
      right: -currentViewport.x + viewportWidth + VIEWPORT_MARGIN,
      top: -currentViewport.y - VIEWPORT_MARGIN,
      bottom: -currentViewport.y + viewportHeight + VIEWPORT_MARGIN,
    };

    return nodes.filter((node) => {
      const nodeRight = node.position.x + (node.measured?.width ?? DEFAULT_NODE_WIDTH);
      const nodeBottom = node.position.y + (node.measured?.height ?? 200);

      return !(
        nodeRight < bounds.left ||
        node.position.x > bounds.right ||
        nodeBottom < bounds.top ||
        node.position.y > bounds.bottom
      );
    });
  }, [nodes, currentViewport]);

  return {
    culledNodes,
    totalNodes: nodes.length,
    culledCount: nodes.length - culledNodes.length,
  };
}
