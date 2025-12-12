import React from 'react';

type Props = {
  children?: React.ReactNode;
};

export const Topbar: React.FC<Props> & { Placeholder?: React.FC } = ({ children }) => {
  return (
    <header
      style={{
        width: '100%',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(15,18,24,0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </header>
  );
};

Topbar.Placeholder = function Placeholder() {
  return (
    <>
      <div style={{ width: 120, height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
      <div style={{ width: 120, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 18 }} />
    </>
  );
};

export default Topbar;
