import React from 'react';
import { tokens } from '../../../styles/tokens';

interface DriverStatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  gradient?: boolean;
}

export function DriverStatsCard({
  icon,
  value,
  label,
  color,
  gradient = false
}: DriverStatsCardProps) {
  const cardStyle = gradient
    ? {
        background: `linear-gradient(135deg, ${color}20, ${color}05)`,
        border: `1px solid ${color}30`
      }
    : {
        background: tokens.colors.background.card,
        border: `1px solid ${tokens.colors.background.cardBorder}`
      };

  return (
    <div style={{
      ...cardStyle,
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center' as const,
      boxShadow: gradient ? `0 4px 12px ${color}20` : tokens.shadows.md
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        color: color || tokens.colors.text,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: tokens.colors.subtle }}>
        {label}
      </div>
    </div>
  );
}
