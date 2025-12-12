import React from 'react';

export function BrandStrip() {
  return (
    <div style={{
      width: '100%',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 5,
      backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        width: '34px',
        height: '34px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #6c5ce7, #00d4ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        color: '#0b1020'
      }}>∞</div>
      <div>
        <div style={{ fontWeight: 800 }}>סנדבוקס עסקי</div>
        <div style={{ color: '#9ba7b6', fontSize: '12px' }}>ניהול חכם ומותאם</div>
      </div>
    </div>
  );
}
