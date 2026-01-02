import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { colors, spacing, borderRadius, zIndex, shadows, typography, transitions } from '../../styles/design-system';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
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
  className,
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
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    padding: spacing['2xl'],
    overflowY: 'auto',
    animation: 'fadeIn 200ms ease-out',
  };

  const modalStyles: React.CSSProperties = {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    width: '100%',
    ...sizeStyles[size],
    maxHeight: size === 'full' ? '95vh' : '90vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: shadows.xl,
    animation: 'modalSlideIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const headerStyles: React.CSSProperties = {
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.primary}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '53px',
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
    alignItems: 'center',
  };

  const [closeButtonHovered, setCloseButtonHovered] = React.useState(false);
  const [closeButtonPressed, setCloseButtonPressed] = React.useState(false);

  const closeButtonStyles: React.CSSProperties = {
    background: closeButtonHovered ? colors.ui.cardHover : 'transparent',
    border: 'none',
    color: colors.text.secondary,
    fontSize: '24px',
    cursor: 'pointer',
    padding: spacing.sm,
    lineHeight: 1,
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${transitions.normal}`,
    transform: closeButtonPressed ? 'scale(0.9)' : 'scale(1)',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  const content = (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeIn {
            from { opacity: 1; }
            to { opacity: 1; }
          }

          @keyframes modalSlideIn {
            from {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        }
      `}</style>
      <div style={overlayStyles} onClick={closeOnOverlayClick ? onClose : undefined}>
        <div style={modalStyles} className={className} onClick={(e) => e.stopPropagation()}>
          {(title || showCloseButton) && (
            <div style={headerStyles}>
              {title && (
                <h2
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                    lineHeight: typography.lineHeight.tight,
                    letterSpacing: typography.letterSpacing.tight,
                  }}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  style={closeButtonStyles}
                  onClick={onClose}
                  onMouseEnter={() => setCloseButtonHovered(true)}
                  onMouseLeave={() => {
                    setCloseButtonHovered(false);
                    setCloseButtonPressed(false);
                  }}
                  onMouseDown={() => setCloseButtonPressed(true)}
                  onMouseUp={() => setCloseButtonPressed(false)}
                  onTouchStart={() => setCloseButtonPressed(true)}
                  onTouchEnd={() => setCloseButtonPressed(false)}
                  aria-label="Close"
                >
                  ✕
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

  return ReactDOM.createPortal(content, document.body);
}

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: subtitle ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        padding: spacing['2xl'],
        borderBottom: `1px solid ${colors.border.primary}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: typography.lineHeight.tight,
            marginBottom: subtitle ? spacing.xs : 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.normal,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text.secondary,
            cursor: 'pointer',
            padding: spacing.sm,
            borderRadius: borderRadius.full,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: transitions.fast,
            marginLeft: spacing.md,
          }}
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export interface ModalBodyProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function ModalBody({ children, noPadding = false }: ModalBodyProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: noPadding ? 0 : spacing['2xl'],
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

export interface ModalFooterProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function ModalFooter({ children, align = 'end' }: ModalFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing.md,
        padding: spacing['2xl'],
        borderTop: `1px solid ${colors.border.primary}`,
        justifyContent: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
      }}
    >
      {children}
    </div>
  );
}
