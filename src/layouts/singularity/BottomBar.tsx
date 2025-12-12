import React from 'react';

type Props = {
  children?: React.ReactNode;
};

export const BottomBar: React.FC<Props> & { Placeholder?: React.FC } = ({ children }) => {
  return (
    <footer
      style={{
        width: '100%',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: 'rgba(15,18,24,0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </footer>
  );
};

BottomBar.Placeholder = function Placeholder() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.08)' }} />
      ))}
    </div>
  );
};

export default BottomBar;
