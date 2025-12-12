import React from 'react';

type DrawerBodyProps = {
  children: React.ReactNode;
};

export function DrawerBody({ children }: DrawerBodyProps) {
  return (
    <div
      style={{
        padding: '12px 0',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 220px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'
      }}
    >
      {children}
    </div>
  );
}
