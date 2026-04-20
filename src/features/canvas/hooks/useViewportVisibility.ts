import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useViewport } from '@xyflow/react';

import { useCanvasStore } from '@/stores/canvasStore';
import type { Viewport } from '@xyflow/react';

export interface VisibilityRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getViewportBounds(
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number,
  margin: number = 200
): VisibilityRect | null {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const zoom = Math.max(0.01, viewport.zoom || 1);
  const left = -viewport.x / zoom - margin;
  const top = -viewport.y / zoom - margin;
  const right = left + containerWidth / zoom + margin * 2;
  const bottom = top + containerHeight / zoom + margin * 2;

  return { minX: left, minY: top, maxX: right, maxY: bottom };
}

function isNodeInViewport(
  nodeX: number,
  nodeY: number,
  nodeWidth: number | undefined,
  nodeHeight: number | undefined,
  bounds: VisibilityRect
): boolean {
  const width = nodeWidth ?? 200;
  const height = nodeHeight ?? 200;

  return (
    nodeX + width >= bounds.minX &&
    nodeX <= bounds.maxX &&
    nodeY + height >= bounds.minY &&
    nodeY <= bounds.maxY
  );
}

export interface ViewportVisibilityState {
  visibleNodeIds: Set<string>;
  isNodeVisible: (nodeId: string) => boolean;
  containerRect: DOMRect | null;
}

export function useViewportVisibility(): ViewportVisibilityState {
  const viewport = useViewport();
  const nodes = useCanvasStore((s) => s.nodes);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const updateContainerRect = useCallback(() => {
    if (containerRef.current) {
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateContainerRect();
    const observer = new ResizeObserver(updateContainerRect);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateContainerRect]);

  const visibleNodeIds = useMemo(() => {
    if (!containerRect) return new Set<string>();
    const bounds = getViewportBounds(viewport, containerRect.width, containerRect.height);
    if (!bounds) return new Set<string>();

    const visible = new Set<string>();
    for (const node of nodes) {
      if (isNodeInViewport(node.position.x, node.position.y, node.width, node.height, bounds)) {
        visible.add(node.id);
      }
    }
    return visible;
  }, [viewport, nodes, containerRect]);

  const isNodeVisible = useCallback(
    (nodeId: string) => visibleNodeIds.has(nodeId),
    [visibleNodeIds]
  );

  return { visibleNodeIds, isNodeVisible, containerRect };
}

export function useNodeViewportVisibility(nodeId: string): boolean {
  const { isNodeVisible } = useViewportVisibility();
  return isNodeVisible(nodeId);
}

export { getViewportBounds, isNodeInViewport };