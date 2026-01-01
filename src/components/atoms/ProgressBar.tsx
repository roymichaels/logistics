import React from 'react';
import { colors } from '../../styles/theme';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  animated = false,
  showLabel = false,
  label
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: '6px', fontSize: '12px' };
      case 'lg':
        return { height: '12px', fontSize: '16px' };
      case 'md':
      default:
        return { height: '8px', fontSize: '14px' };
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return colors.status.success;
      case 'warning':
        return colors.status.warning;
      case 'error':
        return colors.status.error;
      case 'primary':
      default:
        return colors.brand.primary;
    }
  };

  const sizeStyles = getSizeStyles();
  const barColor = getVariantColor();

  return (
    <div style={{ width: '100%' }}>
      {(showLabel || label) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: sizeStyles.fontSize,
            color: colors.text.secondary,
            fontWeight: '500'
          }}
        >
          {label && <span>{label}</span>}
          {showLabel && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: sizeStyles.height,
          backgroundColor: colors.background.tertiary,
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative'
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: '999px',
            transition: animated ? 'width 0.3s ease-in-out' : 'none',
            boxShadow: `0 0 8px ${barColor}40`
          }}
        />
      </div>
    </div>
  );
}
