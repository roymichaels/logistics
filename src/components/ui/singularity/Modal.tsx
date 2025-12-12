import React from 'react';

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  bottomSheet?: boolean;
  children?: React.ReactNode;
};

export const SGModal: React.FC<ModalProps> = ({ open, onClose, bottomSheet = false, children }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: bottomSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: bottomSheet ? '100%' : 'min(480px, 90vw)',
          background: '#0f1218',
          borderRadius: bottomSheet ? '20px 20px 0 0' : 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default SGModal;
