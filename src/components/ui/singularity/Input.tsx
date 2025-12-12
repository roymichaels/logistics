import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export const SGInput: React.FC<Props> = ({ iconLeft, iconRight, style, ...rest }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 12px',
      }}
    >
      {iconLeft}
      <input
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#e8ecf5',
          fontSize: 14,
          ...style,
        }}
        {...rest}
      />
      {iconRight}
    </div>
  );
};

export default SGInput;
