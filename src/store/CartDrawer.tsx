import React from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Placeholder cart drawer (no real cart state yet)
export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-360px',
        width: '320px',
        height: '100vh',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '-12px 0 32px rgba(0,0,0,0.35)',
        transition: 'right 0.3s ease',
        zIndex: 9999,
        color: '#e7e9ea',
        padding: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontWeight: 800 }}>העגלה</div>
        <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer' }}>✕</button>
      </div>
      <p style={{ color: '#9ba7b6' }}>אין פריטים בעגלה.</p>
      <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
        <button
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6c5ce7, #00d4ff)',
            color: '#0b1020',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          ✨ המשך לתשלום
        </button>
      </div>
    </div>
  );
}
