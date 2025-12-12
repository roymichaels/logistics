import React from 'react';

type DrawerProps = {
  open: boolean;
  side?: 'left' | 'right';
  onClose?: () => void;
  children?: React.ReactNode;
};

export const SGDrawer: React.FC<DrawerProps> = ({ open, side = 'right', onClose, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 998,
        pointerEvents: 'none',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: 'min(420px, 92vw)',
          background: '#0f1218',
          borderLeft: side === 'right' ? '1px solid rgba(255,255,255,0.06)' : undefined,
          borderRight: side === 'left' ? '1px solid rgba(255,255,255,0.06)' : undefined,
          boxShadow: '0 12px 48px rgba(0,0,0,0.35)',
          padding: 20,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SGDrawer;
