import React from 'react';

type Props = {
  children?: React.ReactNode;
  padded?: boolean;
  glass?: boolean;
  style?: React.CSSProperties;
};

export const SGCard: React.FC<Props> = ({ children, padded = true, glass = false, style }) => {
  return (
    <div
      style={{
        borderRadius: 16,
        background: glass ? 'rgba(255,255,255,0.05)' : '#121620',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        padding: padded ? 16 : 0,
        backdropFilter: glass ? 'blur(12px)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default SGCard;
