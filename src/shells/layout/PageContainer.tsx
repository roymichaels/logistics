import React from 'react';

type Props = {
  children: React.ReactNode;
};

/**
 * PageContainer
 * Applies vertical rhythm, flex column, and inherits max width from AppContainer.
 */
export const PageContainer: React.FC<Props> = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingTop: 'clamp(12px, 2vh, 32px)',
        paddingBottom: 'clamp(12px, 2vh, 32px)',
        overflowX: 'hidden',
        minHeight: '100%',
      }}
    >
      {children}
    </div>
  );
};

