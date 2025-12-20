import React from 'react';

interface NavigationContentProps {
  children: React.ReactNode;
}

export function NavigationContent({ children }: NavigationContentProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'rgba(18, 18, 20, 0.4)',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(10, 10, 12, 0.3)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.9)',
            letterSpacing: '-0.01em',
          }}
        >
          Menu
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
