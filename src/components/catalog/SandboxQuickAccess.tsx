import React from 'react';

export function SandboxQuickAccess({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '18px',
        left: '18px',
        width: '46px',
        height: '46px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'linear-gradient(135deg, #6c5ce7, #00d4ff)',
        color: '#0b1020',
        fontWeight: 800,
        cursor: 'pointer',
        zIndex: 10
      }}
      title="כניסה מהירה לסנדבוקס הלקוח"
    >
      🪐
    </button>
  );
}
