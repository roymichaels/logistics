import React from 'react';

type SheetProps = {
  open: boolean;
  onClose?: () => void;
  height?: string;
  children?: React.ReactNode;
};

export const SGSheet: React.FC<SheetProps> = ({ open, onClose, height = '70vh', children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 997,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#0f1218',
          height,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 999, margin: '0 auto 12px' }} />
        {children}
      </div>
    </div>
  );
};

export default SGSheet;
