/**
 * DashboardHeader Component
 * Unified dashboard header for consistent page headers across all dashboards
 */

import React from 'react';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '../../styles/theme';
import { getRoleAccentColor } from '../../styles/theme';

export interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  role?: string;
  roleLabel?: string;
  actions?: React.ReactNode;
  icon?: string;
  variant?: 'default' | 'gradient';
}

export function DashboardHeader({
  title,
  subtitle,
  role,
  roleLabel,
  actions,
  icon,
  variant = 'default'
}: DashboardHeaderProps) {
  const roleAccent = role ? getRoleAccentColor(role) : colors.brand.primary;

  const headerStyle: React.CSSProperties = variant === 'gradient' ? {
    background: gradients.primary,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    marginBottom: spacing['3xl'],
    boxShadow: shadows.glow,
    color: colors.white,
  } : {
    marginBottom: spacing['3xl'],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: spacing.lg,
  };

  return (
    <header style={headerStyle}>
      <div style={{ flex: 1, minWidth: '250px' }}>
        {icon && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.sm,
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.lg,
              background: variant === 'gradient' ? 'rgba(255, 255, 255, 0.2)' : gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: variant === 'gradient' ? 'none' : shadows.glow,
            }}>
              {icon}
            </div>
          </div>
        )}

        <h1 style={{
          margin: 0,
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color: variant === 'gradient' ? colors.white : colors.text.primary,
          marginBottom: spacing.sm,
        }}>
          {title}
        </h1>

        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.base,
            color: variant === 'gradient'
              ? 'rgba(255, 255, 255, 0.9)'
              : colors.text.secondary,
            fontWeight: typography.fontWeight.medium,
            marginBottom: roleLabel ? spacing.md : 0,
          }}>
            {subtitle}
          </p>
        )}

        {roleLabel && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `6px ${spacing.md}`,
            background: variant === 'gradient'
              ? 'rgba(255, 255, 255, 0.2)'
              : `${roleAccent}20`,
            borderRadius: borderRadius.full,
            border: variant === 'gradient'
              ? '1px solid rgba(255, 255, 255, 0.3)'
              : `1px solid ${roleAccent}50`,
            marginTop: spacing.md,
          }}>
            <span style={{
              fontSize: typography.fontSize.xs,
              color: variant === 'gradient' ? colors.white : roleAccent,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
            }}>
              {roleLabel}
            </span>
          </div>
        )}
      </div>

      {actions && (
        <div style={{
          display: 'flex',
          gap: spacing.md,
          alignItems: 'center',
          flexWrap: 'wrap' as const,
        }}>
          {actions}
        </div>
      )}
    </header>
  );
}
