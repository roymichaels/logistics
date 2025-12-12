import React from 'react';

type Props = {
  children?: React.ReactNode;
};

export const LeftSidebar: React.FC<Props> & { Placeholder?: React.FC } = ({ children }) => {
  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        minHeight: '50vh',
        padding: '12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </aside>
  );
};

LeftSidebar.Placeholder = function Placeholder() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: 38,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  );
};

export default LeftSidebar;
