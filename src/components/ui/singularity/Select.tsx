import React from 'react';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export const SGSelect: React.FC<Props> = ({ label, style, children, ...rest }) => {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ color: '#9ba3b5', fontSize: 12 }}>{label}</span>}
      <select
        style={{
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#e8ecf5',
          padding: '10px 12px',
          outline: 'none',
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
};

export default SGSelect;
