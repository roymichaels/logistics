import React from 'react';

type Props = {
  open?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  side?: 'left' | 'right';
};

export const Drawer: React.FC<Props> = ({ open = false, onClose, children, side = 'right' }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 90vw)',
          height: '100%',
          background: '#0f1218',
          borderLeft: side === 'right' ? '1px solid rgba(255,255,255,0.06)' : undefined,
          borderRight: side === 'left' ? '1px solid rgba(255,255,255,0.06)' : undefined,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          padding: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Drawer;
