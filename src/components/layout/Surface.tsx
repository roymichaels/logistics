import React from 'react';

type SurfaceProps = {
  children: React.ReactNode;
};

export function Surface({ children }: SurfaceProps) {
  return (
    <div
      style={{
        maxWidth: '540px',
        margin: '0 auto',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
}
