import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  centered?: boolean;
}

export function UndergroundLoadingSpinner({
  size = 'md',
  color = undergroundTheme.colors.accent.primary,
  centered = false
}: UndergroundLoadingSpinnerProps) {
  const sizeMap = {
    sm: '24px',
    md: '40px',
    lg: '64px',
  };

  const spinnerSize = sizeMap[size];

  const containerStyle: React.CSSProperties = centered
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
      }
    : {};

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid ${undergroundTheme.colors.glassmorphism.border}`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          boxShadow: `0 0 20px ${color}40`,
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
