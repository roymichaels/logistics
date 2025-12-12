import React from 'react';

type CategoryPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export const SGCategoryPill: React.FC<CategoryPillProps> = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        cursor: 'pointer',
        padding: '10px 14px',
        borderRadius: 999,
        background: active ? 'rgba(29,155,240,0.18)' : 'rgba(255,255,255,0.06)',
        color: '#e8ecf5',
        fontWeight: 700,
        boxShadow: active ? '0 6px 18px rgba(29,155,240,0.28)' : 'none',
        transition: '160ms ease',
      }}
    >
      {label}
    </button>
  );
};

export default SGCategoryPill;
