import React from 'react';

type Props = {
  children: React.ReactNode;
};

/**
 * AppContainer
 * Enforces global max-width, horizontal padding, and overflow guards.
 */
export const AppContainer: React.FC<Props> = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1480px',
        margin: '0 auto',
        paddingLeft: 'clamp(12px, 3vw, 32px)',
        paddingRight: 'clamp(12px, 3vw, 32px)',
        minHeight: '100%',
        overflowX: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

