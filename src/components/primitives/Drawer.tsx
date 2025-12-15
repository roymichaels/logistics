import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { colors, spacing, shadows, transitions, zIndex } from '../../design-system';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, position = 'right', size = 'md', children, className }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeMap = { sm: '320px', md: '480px', lg: '720px', full: '100%' };
  const drawerSize = sizeMap[size];

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  const drawerStyles: React.CSSProperties = {
    position: 'fixed',
    ...(position === 'left' && { left: 0, top: 0, bottom: 0, width: drawerSize }),
    ...(position === 'right' && { right: 0, top: 0, bottom: 0, width: drawerSize }),
    ...(position === 'bottom' && { bottom: 0, left: 0, right: 0, height: drawerSize, maxHeight: '90vh' }),
    background: colors.background.primary,
    boxShadow: shadows.xl,
    zIndex: zIndex.modal,
    transition: `transform ${transitions.slow}`,
    transform: 'translate(0, 0)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colors.ui.overlay,
    zIndex: zIndex.modal - 1,
    transition: `opacity ${transitions.slow}`,
  };

  const content = (
    <>
      <div style={overlayStyles} onClick={onClose} />
      <div style={drawerStyles} className={className}>
        {children}
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}

export interface DrawerHeaderProps {
  title: string;
  onClose: () => void;
}

export function DrawerHeader({ title, onClose }: DrawerHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing[4],
        borderBottom: `1px solid ${colors.border.primary}`,
      }}
    >
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: colors.text.primary }}>{title}</h2>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colors.text.secondary,
          cursor: 'pointer',
          padding: spacing[2],
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: transitions.fast,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export interface DrawerBodyProps {
  children: React.ReactNode;
}

export function DrawerBody({ children }: DrawerBodyProps) {
  return <div style={{ flex: 1, padding: spacing[4], overflowY: 'auto' }}>{children}</div>;
}

export interface DrawerFooterProps {
  children: React.ReactNode;
}

export function DrawerFooter({ children }: DrawerFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing[3],
        padding: spacing[4],
        borderTop: `1px solid ${colors.border.primary}`,
        justifyContent: 'flex-end',
      }}
    >
      {children}
    </div>
  );
}
