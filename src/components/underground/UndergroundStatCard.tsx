import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from './UndergroundCard';

interface UndergroundStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  accentColor?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
}

export function UndergroundStatCard({
  icon,
  label,
  value,
  subtext,
  accentColor = undergroundTheme.colors.accent.primary,
  trend,
  onClick,
}: UndergroundStatCardProps) {
  const trendColor = trend?.direction === 'up' ? undergroundTheme.colors.status.success :
                     trend?.direction === 'down' ? undergroundTheme.colors.status.error :
                     undergroundTheme.colors.text.tertiary;

  return (
    <UndergroundCard hover={!!onClick} onClick={onClick}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: undergroundTheme.spacing.lg }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: undergroundTheme.borderRadius.lg,
            background: `${accentColor}15`,
            color: accentColor,
            boxShadow: `0 0 20px ${accentColor}30`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary,
              marginBottom: undergroundTheme.spacing.xs,
              fontWeight: undergroundTheme.typography.fontWeight.medium,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: undergroundTheme.typography.fontSize['3xl'],
              color: undergroundTheme.colors.text.primary,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              lineHeight: '1',
              marginBottom: subtext || trend ? undergroundTheme.spacing.xs : 0,
            }}
          >
            {value}
          </div>

          {(subtext || trend) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.sm }}>
              {subtext && (
                <span
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                  }}
                >
                  {subtext}
                </span>
              )}

              {trend && (
                <span
                  style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: trendColor,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </UndergroundCard>
  );
}
