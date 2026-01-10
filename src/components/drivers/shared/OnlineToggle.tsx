import React from 'react';
import { undergroundTheme } from '../../../styles/undergroundTheme';
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
      background: undergroundTheme.colors.surface.card,
      borderRadius: undergroundTheme.borderRadius.xl,
      padding: undergroundTheme.spacing['2xl'],
      border: `2px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.border.default}`,
      boxShadow: isOnline
        ? `0 8px 24px ${undergroundTheme.colors.status.success}30, ${undergroundTheme.shadows.card.hover}`
        : undergroundTheme.shadows.card.default,
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: undergroundTheme.spacing.lg
      }}>
        <div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.text.primary,
            marginBottom: undergroundTheme.spacing.xs,
            textShadow: isOnline ? undergroundTheme.shadows.glow.text : 'none'
          }}>
            סטטוס
          </div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.secondary
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
              ? `linear-gradient(135deg, ${undergroundTheme.colors.status.success}, ${undergroundTheme.colors.status.successDark})`
              : undergroundTheme.colors.surface.darker,
            border: `2px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.border.subtle}`,
            borderRadius: undergroundTheme.borderRadius.full,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
            boxShadow: isOnline
              ? `0 0 20px ${undergroundTheme.colors.status.success}50, ${undergroundTheme.shadows.glow.green}`
              : 'none',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <div style={{
            position: 'absolute',
            top: '4px',
            [isOnline ? 'right' : 'left']: '4px',
            width: '28px',
            height: '28px',
            background: isOnline
              ? undergroundTheme.colors.text.primary
              : undergroundTheme.colors.text.tertiary,
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            boxShadow: undergroundTheme.shadows.card.default
          }} />
        </button>
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: undergroundTheme.spacing.sm,
        padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
        background: isOnline
          ? `${undergroundTheme.colors.status.success}15`
          : `${undergroundTheme.colors.text.tertiary}15`,
        border: `1px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.tertiary}50`,
        borderRadius: undergroundTheme.borderRadius.lg,
        fontSize: undergroundTheme.typography.fontSize.sm,
        fontWeight: undergroundTheme.typography.fontWeight.semibold,
        color: isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.tertiary
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.tertiary,
          boxShadow: isOnline
            ? `0 0 8px ${undergroundTheme.colors.status.success}, ${undergroundTheme.shadows.glow.green}`
            : 'none',
          animation: isOnline ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
        {isOnline ? 'מחובר' : 'לא מחובר'}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
