import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const UndergroundProgress: React.FC<UndergroundProgressProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  variant = 'default',
  size = 'md',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeConfig = {
    sm: '6px',
    md: '10px',
    lg: '14px',
  };

  const variantColors = {
    default: undergroundTheme.colors.accent.primary,
    success: undergroundTheme.colors.status.success,
    warning: undergroundTheme.colors.status.warning,
    error: undergroundTheme.colors.status.error,
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
  };

  const labelContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: undergroundTheme.spacing.xs,
  };

  const labelStyle: React.CSSProperties = {
    color: undergroundTheme.colors.text.primary,
    fontSize: undergroundTheme.typography.fontSize.sm,
    fontWeight: undergroundTheme.typography.fontWeight.medium,
  };

  const percentageStyle: React.CSSProperties = {
    color: undergroundTheme.colors.text.secondary,
    fontSize: undergroundTheme.typography.fontSize.sm,
  };

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: sizeConfig[size],
    background: undergroundTheme.colors.background.dark,
    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    borderRadius: undergroundTheme.borderRadius.full,
    overflow: 'hidden',
  };

  const barStyle: React.CSSProperties = {
    width: `${percentage}%`,
    height: '100%',
    background: `linear-gradient(90deg, ${variantColors[variant]}, ${variantColors[variant]}cc)`,
    boxShadow: `0 0 10px ${variantColors[variant]}80`,
    transition: `width ${undergroundTheme.transitions.slow}`,
    borderRadius: undergroundTheme.borderRadius.full,
  };

  return (
    <div style={containerStyle}>
      {(label || showPercentage) && (
        <div style={labelContainerStyle}>
          {label && <span style={labelStyle}>{label}</span>}
          {showPercentage && <span style={percentageStyle}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div style={trackStyle}>
        <div style={barStyle} />
      </div>
    </div>
  );
};
