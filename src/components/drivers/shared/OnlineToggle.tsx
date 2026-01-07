import React from 'react';
import { tokens } from '../../../styles/tokens';
import { haptic } from '../../../utils/haptic';

interface OnlineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function OnlineToggle({ isOnline, onToggle, disabled = false }: OnlineToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      haptic('medium');
      onToggle();
    }
  };

  return (
    <div style={{
      background: tokens.colors.background.card,
      borderRadius: '20px',
      padding: '24px',
      border: `2px solid ${isOnline ? tokens.colors.status.success : tokens.colors.background.cardBorder}`,
      boxShadow: isOnline ? `0 8px 24px ${tokens.colors.status.success}30` : tokens.shadows.md
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '4px'
          }}>
            סטטוס
          </div>
          <div style={{
            fontSize: '14px',
            color: tokens.colors.subtle
          }}>
            {isOnline ? 'מחובר ומוכן למשלוחים' : 'לא מחובר'}
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={disabled}
          style={{
            position: 'relative',
            width: '72px',
            height: '40px',
            background: isOnline
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : tokens.colors.bg,
            border: `2px solid ${isOnline ? '#10b981' : tokens.colors.background.cardBorder}`,
            borderRadius: '20px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
            boxShadow: isOnline ? tokens.glows.success : 'none',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <div style={{
            position: 'absolute',
            top: '4px',
            [isOnline ? 'right' : 'left']: '4px',
            width: '28px',
            height: '28px',
            background: '#ffffff',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }} />
        </button>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: isOnline
          ? `${tokens.colors.status.success}20`
          : `${tokens.colors.subtle}20`,
        border: `1px solid ${isOnline ? tokens.colors.status.success : tokens.colors.subtle}50`,
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: isOnline ? tokens.colors.status.success : tokens.colors.subtle
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isOnline ? tokens.colors.status.success : tokens.colors.subtle,
          boxShadow: isOnline ? `0 0 8px ${tokens.colors.status.success}` : 'none'
        }} />
        {isOnline ? 'מחובר' : 'לא מחובר'}
      </div>
    </div>
  );
}
