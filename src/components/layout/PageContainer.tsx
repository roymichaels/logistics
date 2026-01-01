import React from 'react';
import { tokens } from '../../styles/tokens';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  withGradient?: boolean;
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  maxWidth = '1200px',
  withGradient = true,
  style
}: PageContainerProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.background.primary,
        padding: '20px',
        paddingBottom: '100px',
        color: tokens.colors.text.primary,
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {withGradient && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(80% 80% at 80% 10%, rgba(29, 155, 240, 0.08) 0%, rgba(21, 32, 43, 0) 60%)',
            pointerEvents: 'none'
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}
