import { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDeviceType } from '@/features/canvas/hooks/useDeviceType';
import { UI_POPOVER_TRANSITION_MS } from '@/components/ui/motion';

interface MobileBottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const MobileBottomDrawer = memo(({
  isOpen,
  onClose,
  title,
  children,
}: MobileBottomDrawerProps) => {
  const { isMobile, isTablet } = useDeviceType();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const isDesktopOrLarger = !isMobile && !isTablet;

  useEffect(() => {
    if (!isOpen || isDesktopOrLarger) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDesktopOrLarger]);

  if (isDesktopOrLarger) {
    return null;
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const startY = e.touches[0].clientY;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 80) {
        onClose();
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
  }, [onClose]);

  return createPortal(
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm transition-opacity"
          style={{ animation: `fadeIn ${UI_POPOVER_TRANSITION_MS}ms ease-out` }}
          onClick={onClose}
        />
      )}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl border-t border-[rgba(255,255,255,0.15)] bg-surface-dark/98 shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '60vh' }}
        onTouchStart={handleTouchStart}
      >
        <div className="flex h-11 w-full items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-sm font-medium text-text-dark">{title}</span>
            )}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-dark/60 hover:text-text-dark"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(60vh - 44px)' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
});

MobileBottomDrawer.displayName = 'MobileBottomDrawer';

export function useMobileToolbar() {
  const { isMobile, isTablet } = useDeviceType();
  return isMobile || isTablet;
}