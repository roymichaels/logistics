import React from 'react';

type Props = {
  open?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
};

export const Sheet: React.FC<Props> = ({ open = false, onClose, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '80vh',
          background: '#0f1218',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: '0 -6px 40px rgba(0,0,0,0.4)',
          padding: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Sheet;
