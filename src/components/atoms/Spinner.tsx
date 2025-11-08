import React from 'react';
import { colors } from '../../styles/design-system';

export interface SpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
}

export function Spinner({ size = 24, color = colors.brand.primary, thickness = 3 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
        opacity="0.3"
      />
    </svg>
  );
}

export function FullPageSpinner({ message }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: colors.background.primary,
        gap: '16px',
      }}
    >
      <Spinner size={48} />
      {message && (
        <p
          style={{
            color: colors.text.secondary,
            fontSize: '14px',
            margin: 0,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
