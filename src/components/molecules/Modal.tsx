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
    background: colors.ui.overlay, // Twitter's overlay
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    padding: spacing['2xl'],
    overflowY: 'auto',
    animation: 'fadeIn 200ms ease-in-out',
  };

  const modalStyles: React.CSSProperties = {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl, // 16px - Twitter modal radius
    width: '100%',
    ...sizeStyles[size],
    maxHeight: size === 'full' ? '95vh' : '90vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
    animation: 'modalSlideIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const headerStyles: React.CSSProperties = {
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '53px', // Twitter's standard header height
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
    fontSize: '20px',
    cursor: 'pointer',
    padding: spacing.sm,
    lineHeight: 1,
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 200ms ease-in-out',
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div style={overlayStyles} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div style={headerStyles}>
            {title && (
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: colors.text.primary,
                letterSpacing: '-0.5px'
              }}>
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
    </>
  );
}
