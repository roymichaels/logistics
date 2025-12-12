import React from 'react';

interface StoreHeaderProps {
  onCart: () => void;
}

export function StoreHeader({ onCart }: StoreHeaderProps) {
  return (
    <header style={{
      padding: '14px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(10px)',
      background: 'rgba(0,0,0,0.35)',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6c5ce7, #00d4ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0b1020',
          fontWeight: 800
        }}>∞</div>
        <div>
          <div style={{ fontWeight: 800 }}>חנות הלקוח</div>
          <div style={{ color: '#9ba7b6', fontSize: '12px' }}>קטלוג חכם</div>
        </div>
      </div>
      <button
        onClick={onCart}
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        🛒 העגלה
      </button>
    </header>
  );
}
