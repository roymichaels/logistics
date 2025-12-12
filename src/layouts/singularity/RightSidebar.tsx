import React from 'react';

type Props = {
  children?: React.ReactNode;
};

export const RightSidebar: React.FC<Props> & { Placeholder?: React.FC } = ({ children }) => {
  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'start',
        minHeight: '50vh',
        padding: '12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </aside>
  );
};

RightSidebar.Placeholder = function Placeholder() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ height: 120, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ height: 160, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
};

export default RightSidebar;
