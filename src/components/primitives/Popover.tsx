import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

type PopoverProps = {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

type Position = { top: number; left: number; transformOrigin: string };

export function Popover({ isOpen, anchorRef, onClose, children, className }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const closeOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
      if (anchorRef.current && anchorRef.current.contains(e.target as Node)) return;
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', closeOnEsc);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !popoverRef.current) return;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const popRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    let top = anchorRect.bottom + padding;
    let left = anchorRect.left + (anchorRect.width - popRect.width) / 2;
    let transformOrigin = 'top center';

    // Horizontal clamp
    if (left < padding) left = padding;
    if (left + popRect.width > viewportWidth - padding) {
      left = viewportWidth - padding - popRect.width;
    }

    // Vertical flip if needed
    if (top + popRect.height > viewportHeight - padding) {
      top = anchorRect.top - popRect.height - padding;
      transformOrigin = 'bottom center';
      if (top < padding) {
        top = padding;
        transformOrigin = 'center center';
      }
    }

    setPosition({ top, left, transformOrigin });
  }, [isOpen, anchorRef.current]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={popoverRef}
      className={className}
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        minWidth: 'min(280px, 90vw)',
        maxWidth: 'min(320px, 90vw)',
        padding: '8px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
        transformOrigin: position?.transformOrigin ?? 'top center'
      }}
    >
      {children}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
