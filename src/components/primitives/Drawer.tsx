import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Drawer({ isOpen, onClose, children, className }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : true;

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        zIndex: 10000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'stretch',
        justifyContent: isMobile ? 'stretch' : 'flex-end'
      }}
      onMouseDown={onClose}
    >
      <div
        className={className}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : '420px',
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px)',
          background: 'var(--color-panel)',
          borderTop: '1px solid var(--color-border)',
          borderLeft: isMobile ? 'none' : '1px solid var(--color-border)',
          borderRadius: isMobile ? '12px 12px 0 0' : '0 0 0 0',
          boxShadow: 'var(--shadow-lg)',
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
