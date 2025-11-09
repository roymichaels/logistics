/**
 * Section Component
 * Reusable section container for dashboard content organization
 */

import React from 'react';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/theme';

export interface SectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
}

export function Section({
  title,
  subtitle,
  actions,
  children,
  variant = 'default',
}: SectionProps) {
  const getSectionStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          background: colors.ui.card,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.xl,
          padding: spacing['2xl'],
          boxShadow: shadows.md,
        };
      case 'flat':
        return {
          background: 'transparent',
          padding: 0,
        };
      default:
        return {
          background: colors.ui.card,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.xl,
          padding: spacing['2xl'],
          boxShadow: shadows.sm,
        };
    }
  };

  return (
    <section
      style={{
        ...getSectionStyle(),
        marginBottom: spacing['2xl'],
      }}
    >
      {(title || actions) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.xl,
          flexWrap: 'wrap' as const,
          gap: spacing.md,
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            {title && (
              <h2 style={{
                margin: 0,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginBottom: subtitle ? spacing.xs : 0,
              }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div style={{
              display: 'flex',
              gap: spacing.md,
              alignItems: 'center',
            }}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
