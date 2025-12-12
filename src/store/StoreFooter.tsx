import React from 'react';

interface StoreFooterProps {
  onNavigate?: (page: string) => void;
}

export function StoreFooter({ onNavigate }: StoreFooterProps) {
  return (
    <footer style={{
      padding: '18px 16px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(0,0,0,0.35)',
      color: '#9ba7b6',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
        <button
          onClick={() => onNavigate?.('store-orders')}
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ההזמנות שלי
        </button>
        <button
          onClick={() => onNavigate?.('store-profile')}
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          פרופיל
        </button>
      </div>
    </footer>
  );
}
