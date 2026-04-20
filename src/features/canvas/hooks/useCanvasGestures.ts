import { useCallback, useRef } from 'react';

interface GestureState {
  lastTap: number;
}

export function useCanvasGestures() {
  const gestureStateRef = useRef<GestureState>({ lastTap: 0 });

  const handleTouchEnd = useCallback(() => {
    // Will be used for pinch zoom cleanup
  }, []);

  const handleDoubleTap = useCallback((nodeId: string, callback: (nodeId: string) => void) => {
    const now = Date.now();
    const timeSinceLastTap = now - gestureStateRef.current.lastTap;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      callback(nodeId);
      gestureStateRef.current.lastTap = 0;
    } else {
      gestureStateRef.current.lastTap = now;
    }
  }, []);

  return {
    handleDoubleTap,
    handleTouchEnd,
  };
}