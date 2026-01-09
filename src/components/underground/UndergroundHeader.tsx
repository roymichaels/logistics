import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  gradient?: boolean;
}

export function UndergroundHeader({ title, subtitle, actions, icon, gradient = false }: UndergroundHeaderProps) {
  return (
    <div
      style={{
        marginBottom: undergroundTheme.spacing['4xl'],
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: undergroundTheme.spacing.xl,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: '250px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.lg, marginBottom: undergroundTheme.spacing.sm }}>
          {icon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: undergroundTheme.borderRadius.lg,
                background: `${undergroundTheme.colors.accent.primary}20`,
                color: undergroundTheme.colors.accent.primary,
                boxShadow: undergroundTheme.shadows.glow.cyan,
              }}
            >
              {icon}
            </div>
          )}
          <h1
            style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['4xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              background: gradient ? undergroundTheme.colors.gradient.accent : 'transparent',
              backgroundClip: gradient ? 'text' : 'border-box',
              WebkitBackgroundClip: gradient ? 'text' : 'border-box',
              WebkitTextFillColor: gradient ? 'transparent' : undergroundTheme.colors.text.primary,
            }}
          >
            {title}
          </h1>
        </div>

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize.base,
              color: undergroundTheme.colors.text.secondary,
              fontWeight: undergroundTheme.typography.fontWeight.medium,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
