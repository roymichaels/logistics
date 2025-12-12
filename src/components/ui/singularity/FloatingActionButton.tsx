import React from 'react';

type FloatingActionButtonProps = {
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
};

export const SGFloatingActionButton: React.FC<FloatingActionButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg, #1d9bf0, #7c6dff)',
        color: '#0b1020',
        fontWeight: 800,
        boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        cursor: 'pointer',
      }}
      aria-label={label}
      title={label}
    >
      {icon || '+'}
    </button>
  );
};

export default SGFloatingActionButton;
