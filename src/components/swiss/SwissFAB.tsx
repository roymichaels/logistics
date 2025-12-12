import React from 'react';

type Props = {
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  className?: string;
};

export const SwissFAB: React.FC<Props> = ({ icon = '+', label, onClick, className }) => {
  return (
    <button
      type="button"
      className={className}
      data-swiss-fab
      onClick={onClick}
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg, #1d9bf0, #00b7ff)',
        color: '#0b1020',
        fontWeight: 800,
        boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <span>{icon}</span>
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </button>
  );
};

export default SwissFAB;
