import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { colors, spacing, borderRadius, shadows, transitions, zIndex } from '../../design-system';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export function Modal({ isOpen, onClose, size = 'md', children, className, closeOnOverlayClick = true }: ModalProps) {
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

  const sizeMap = { sm: '400px', md: '600px', lg: '800px', xl: '1000px', full: '95vw' };

  const modalStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: sizeMap[size],
    maxHeight: '90vh',
    background: colors.background.primary,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border.primary}`,
    boxShadow: shadows['2xl'],
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: transitions.normal,
  };

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colors.ui.overlay,
    zIndex: zIndex.modal,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  };

  const content = (
    <div style={overlayStyles} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div style={modalStyles} className={className} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

export interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
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

export interface ModalBodyProps {
  children: React.ReactNode;
}

export function ModalBody({ children }: ModalBodyProps) {
  return <div style={{ flex: 1, padding: spacing[4], overflowY: 'auto' }}>{children}</div>;
}

export interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
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
