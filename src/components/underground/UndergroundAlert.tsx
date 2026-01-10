import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundAlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const UndergroundAlert: React.FC<UndergroundAlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
}) => {
  const typeConfig = {
    success: {
      bg: 'rgba(34, 211, 238, 0.1)',
      border: undergroundTheme.colors.status.success,
      icon: '✓',
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      border: undergroundTheme.colors.status.warning,
      icon: '⚠',
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: undergroundTheme.colors.status.error,
      icon: '✕',
    },
    info: {
      bg: 'rgba(0, 217, 255, 0.1)',
      border: undergroundTheme.colors.accent.primary,
      icon: 'ⓘ',
    },
  };

  const config = typeConfig[type];

  const alertStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: undergroundTheme.spacing.md,
    padding: undergroundTheme.spacing.md,
    background: config.bg,
    border: `1px solid ${config.border}`,
    borderRadius: undergroundTheme.borderRadius.lg,
    backdropFilter: 'blur(10px)',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: undergroundTheme.typography.fontSize.lg,
    color: config.border,
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    color: undergroundTheme.colors.text.primary,
    fontSize: undergroundTheme.typography.fontSize.base,
    fontWeight: undergroundTheme.typography.fontWeight.semibold,
    marginBottom: undergroundTheme.spacing.xs,
  };

  const messageStyle: React.CSSProperties = {
    color: undergroundTheme.colors.text.secondary,
    fontSize: undergroundTheme.typography.fontSize.sm,
    lineHeight: undergroundTheme.typography.lineHeight.normal,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: undergroundTheme.colors.text.tertiary,
    cursor: 'pointer',
    fontSize: undergroundTheme.typography.fontSize.lg,
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
  };

  return (
    <div style={alertStyle}>
      <div style={iconStyle}>{config.icon}</div>
      <div style={contentStyle}>
        {title && <div style={titleStyle}>{title}</div>}
        <div style={messageStyle}>{message}</div>
      </div>
      {onClose && (
        <button style={closeButtonStyle} onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};
