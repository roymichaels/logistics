import React, { ReactNode, useEffect } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getGlassmorphicStyle } from '../../utils/undergroundStyles';

interface UndergroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function UndergroundModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: UndergroundModalProps) {
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

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeMap = {
    sm: '400px',
    md: '600px',
    lg: '800px',
    xl: '1000px',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: undergroundTheme.spacing.xl,
    animation: 'fadeIn 200ms ease-out',
  };

  const modalStyle: React.CSSProperties = {
    ...getGlassmorphicStyle('strong'),
    width: '100%',
    maxWidth: sizeMap[size],
    maxHeight: '90vh',
    borderRadius: undergroundTheme.borderRadius.xl,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: undergroundTheme.shadows.glow.cyanLarge,
    animation: 'slideUp 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  const headerStyle: React.CSSProperties = {
    ...getGlassmorphicStyle('light'),
    padding: undergroundTheme.spacing.xl,
    borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: undergroundTheme.typography.fontSize['2xl'],
    fontWeight: undergroundTheme.typography.fontWeight.bold,
    color: undergroundTheme.colors.text.primary,
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: undergroundTheme.colors.text.secondary,
    padding: undergroundTheme.spacing.sm,
    borderRadius: undergroundTheme.borderRadius.md,
    transition: undergroundTheme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
  };

  const bodyStyle: React.CSSProperties = {
    padding: undergroundTheme.spacing.xl,
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle: React.CSSProperties = {
    ...getGlassmorphicStyle('light'),
    padding: undergroundTheme.spacing.xl,
    borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    display: 'flex',
    gap: undergroundTheme.spacing.md,
    justifyContent: 'flex-end',
  };

  const handleCloseButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
    e.currentTarget.style.color = undergroundTheme.colors.status.error;
  };

  const handleCloseButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = undergroundTheme.colors.text.secondary;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title}</h2>
            <button
              style={closeButtonStyle}
              onClick={onClose}
              onMouseEnter={handleCloseButtonMouseEnter}
              onMouseLeave={handleCloseButtonMouseLeave}
            >
              ✕
            </button>
          </div>
        )}

        <div style={bodyStyle}>{children}</div>

        {footer && <div style={footerStyle}>{footer}</div>}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}
