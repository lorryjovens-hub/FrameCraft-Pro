import { useCallback, useRef, useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useDeviceType } from './useDeviceType';

interface TouchDragState {
  isDragging: boolean;
  lastTouchPos: { x: number; y: number } | null;
  touchStartTime: number;
  draggedNodeId: string | null;
}

interface PinchZoomState {
  isPinching: boolean;
  initialDistance: number;
  initialZoom: number;
}

interface LongPressState {
  timer: ReturnType<typeof setTimeout> | null;
  startPos: { x: number; y: number } | null;
}

const LONG_PRESS_DURATION = 500;
const MIN_PINCH_ZOOM = 0.1;
const MAX_PINCH_ZOOM = 5;
const TOUCH_DRAG_THRESHOLD = 5;

export function useMobileCanvasInteraction(
  onNodeLongPress?: (nodeId: string, x: number, y: number) => void
) {
  const { deviceType, isTouchDevice } = useDeviceType();
  const { zoomTo, getViewport } = useReactFlow();

  const touchDragState = useRef<TouchDragState>({
    isDragging: false,
    lastTouchPos: null,
    touchStartTime: 0,
    draggedNodeId: null,
  });

  const pinchZoomState = useRef<PinchZoomState>({
    isPinching: false,
    initialDistance: 0,
    initialZoom: 1,
  });

  const longPressState = useRef<LongPressState>({
    timer: null,
    startPos: null,
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchDragState.current = {
          isDragging: false,
          lastTouchPos: { x: touch.clientX, y: touch.clientY },
          touchStartTime: Date.now(),
          draggedNodeId: null,
        };

        longPressState.current = {
          timer: setTimeout(() => {
            if (touchDragState.current.lastTouchPos) {
              onNodeLongPress?.(
                '',
                touchDragState.current.lastTouchPos.x,
                touchDragState.current.lastTouchPos.y
              );
            }
          }, LONG_PRESS_DURATION),
          startPos: { x: touch.clientX, y: touch.clientY },
        };
      } else if (e.touches.length === 2) {
        if (longPressState.current.timer) {
          clearTimeout(longPressState.current.timer);
          longPressState.current.timer = null;
        }

        pinchZoomState.current = {
          isPinching: true,
          initialDistance: getDistance(e.touches),
          initialZoom: getViewport().zoom,
        };
        setIsInteracting(true);
      }
    },
    [getDistance, getViewport, onNodeLongPress]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1 && touchDragState.current.lastTouchPos) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchDragState.current.lastTouchPos.x;
        const dy = touch.clientY - touchDragState.current.lastTouchPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > TOUCH_DRAG_THRESHOLD) {
          if (longPressState.current.timer) {
            clearTimeout(longPressState.current.timer);
            longPressState.current.timer = null;
          }

          touchDragState.current.isDragging = true;
          setIsInteracting(true);
        }
      } else if (e.touches.length === 2 && pinchZoomState.current.isPinching) {
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / pinchZoomState.current.initialDistance;
        let newZoom = pinchZoomState.current.initialZoom * scale;
        newZoom = Math.max(MIN_PINCH_ZOOM, Math.min(MAX_PINCH_ZOOM, newZoom));

        zoomTo(newZoom);
      }
    },
    [getDistance, zoomTo]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (longPressState.current.timer) {
          clearTimeout(longPressState.current.timer);
          longPressState.current.timer = null;
        }

        if (touchDragState.current.isDragging) {
          touchDragState.current.isDragging = false;
        }

        if (pinchZoomState.current.isPinching) {
          pinchZoomState.current.isPinching = false;
        }

        setIsInteracting(false);
      } else if (e.touches.length === 1) {
        pinchZoomState.current.isPinching = false;
      }
    },
    []
  );

  const setupContainerListeners = useCallback(
    (container: HTMLDivElement) => {
      containerRef.current = container;

      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      };
    },
    [handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  useEffect(() => {
    return () => {
      if (longPressState.current.timer) {
        clearTimeout(longPressState.current.timer);
      }
    };
  }, []);

  return {
    isTouchDevice,
    deviceType,
    isInteracting,
    setupContainerListeners,
  };
}

export function useTouchZoom() {
  const { zoomTo, getViewport, fitView } = useReactFlow();

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      const delta = -e.deltaY;
      const zoom = getViewport().zoom;
      const newZoom = Math.max(MIN_PINCH_ZOOM, Math.min(MAX_PINCH_ZOOM, zoom * (1 + delta * 0.01)));
      zoomTo(newZoom);
    },
    [getViewport, zoomTo]
  );

  return {
    handleWheel,
    fitView,
    MIN_PINCH_ZOOM,
    MAX_PINCH_ZOOM,
  };
}
