import React from 'react';
import { undergroundTheme } from '../../../styles/undergroundTheme';

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
  const accentColor = color || undergroundTheme.colors.primary.cyan;

  const cardStyle = gradient
    ? {
        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
        border: `1px solid ${accentColor}40`,
        boxShadow: `0 4px 20px ${accentColor}25, ${undergroundTheme.shadows.card.default}`
      }
    : {
        background: undergroundTheme.colors.surface.darker,
        border: `1px solid ${undergroundTheme.colors.border.subtle}`,
        boxShadow: undergroundTheme.shadows.card.default
      };

  return (
    <div style={{
      ...cardStyle,
      borderRadius: undergroundTheme.borderRadius.lg,
      padding: undergroundTheme.spacing.xl,
      textAlign: 'center' as const,
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        fontSize: undergroundTheme.typography.fontSize['3xl'],
        marginBottom: undergroundTheme.spacing.sm,
        filter: gradient ? `drop-shadow(0 0 8px ${accentColor}60)` : 'none'
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: undergroundTheme.typography.fontSize['3xl'],
        fontWeight: undergroundTheme.typography.fontWeight.bold,
        color: color || undergroundTheme.colors.text.primary,
        marginBottom: undergroundTheme.spacing.xs,
        textShadow: gradient ? undergroundTheme.shadows.glow.cyan : 'none'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: undergroundTheme.typography.fontSize.sm,
        color: undergroundTheme.colors.text.secondary,
        fontWeight: undergroundTheme.typography.fontWeight.medium
      }}>
        {label}
      </div>
    </div>
  );
}
