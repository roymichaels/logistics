import React from 'react';

type ModalBodyProps = {
  children: React.ReactNode;
};

export function ModalBody({ children }: ModalBodyProps) {
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
