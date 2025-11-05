import React from 'react';
import { telegram } from '../lib/telegram';
import { ROYAL_COLORS } from '../styles/royalTheme';

interface SidebarToggleButtonProps {
  onClick: () => void;
  hasNotifications?: boolean;
}

export function SidebarToggleButton({ onClick, hasNotifications = false }: SidebarToggleButtonProps) {
  const handleClick = () => {
    telegram.hapticFeedback('impact', 'light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '48px',
        height: '120px',
        background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
        border: 'none',
        borderRadius: '12px 0 0 12px',
        boxShadow: '-4px 0 20px rgba(29, 155, 240, 0.4)',
        cursor: 'pointer',
        zIndex: 998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 8px',
        transition: 'all 0.3s ease',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-50%) translateX(-4px)';
        e.currentTarget.style.boxShadow = '-6px 0 30px rgba(29, 155, 240, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(-50%)';
        e.currentTarget.style.boxShadow = '-4px 0 20px rgba(29, 155, 240, 0.4)';
      }}
    >
      <span style={{
        fontSize: '24px',
        transform: 'rotate(90deg)'
      }}>
        📋
      </span>
      <span style={{
        fontSize: '14px',
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: '1px'
      }}>
        תפקידי
      </span>
      {hasNotifications && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#ff3b30',
          border: '2px solid #ffffff',
          boxShadow: '0 0 8px rgba(255, 59, 48, 0.6)',
          animation: 'pulse 2s infinite'
        }} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </button>
  );
}
