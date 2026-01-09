import React from 'react';
import { modernTokens } from '../../styles/modernTokens';

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
        background: modernTokens.colors.background.base,
        padding: '20px',
        paddingBottom: '100px',
        color: modernTokens.colors.text.primary,
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
              'radial-gradient(80% 80% at 80% 10%, rgba(0, 212, 255, 0.06) 0%, rgba(10, 14, 20, 0) 60%)',
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
