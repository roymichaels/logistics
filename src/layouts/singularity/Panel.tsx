import React from 'react';

type Props = {
  title?: string;
  children?: React.ReactNode;
};

export const Panel: React.FC<Props> = ({ title, children }) => {
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 16,
        backdropFilter: 'blur(8px)',
      }}
    >
      {title && <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>}
      {children}
    </section>
  );
};

export default Panel;
