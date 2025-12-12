import React from 'react';

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  fluid?: boolean;
};

/**
 * Global containment wrapper to prevent horizontal overflow
 * and keep content centered at a readable max width.
 */
export function AppContainer({ children, style, fluid = false }: Props) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: fluid ? '100%' : '1480px',
        margin: fluid ? 0 : '0 auto',
        padding: fluid ? '0 clamp(10px, 3vw, 22px)' : '0 clamp(12px, 3vw, 28px)',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default AppContainer;
