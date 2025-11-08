import React, { useEffect } from 'react';
import { colors, spacing, borderRadius, zIndex } from '../../styles/design-system';
import { Button } from '../atoms';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '600px' },
    lg: { maxWidth: '800px' },
    xl: { maxWidth: '1200px' },
    full: { maxWidth: '95vw', height: '95vh' },
  };

  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.ui.overlay,
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    padding: spacing['2xl'],
    overflowY: 'auto',
  };

  const modalStyles: React.CSSProperties = {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius['2xl'],
    width: '100%',
    ...sizeStyles[size],
    maxHeight: size === 'full' ? '95vh' : '90vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  };

  const headerStyles: React.CSSProperties = {
    padding: spacing['2xl'],
    borderBottom: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyles: React.CSSProperties = {
    padding: spacing['2xl'],
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyles: React.CSSProperties = {
    padding: spacing['2xl'],
    borderTop: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.md,
  };

  const closeButtonStyles: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: colors.text.secondary,
    fontSize: '24px',
    cursor: 'pointer',
    padding: spacing.sm,
    lineHeight: 1,
  };

  return (
    <div style={overlayStyles} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div style={headerStyles}>
            {title && (
              <h2 style={{ margin: 0, fontSize: '20px', color: colors.text.primary }}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button style={closeButtonStyles} onClick={onClose} aria-label="Close">
                ×
              </button>
            )}
          </div>
        )}
        <div style={bodyStyles}>{children}</div>
        {footer && <div style={footerStyles}>{footer}</div>}
      </div>
    </div>
  );
}
