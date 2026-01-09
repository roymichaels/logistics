import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UndergroundSection({
  title,
  subtitle,
  children,
  actions,
  spacing = 'xl',
  className
}: UndergroundSectionProps) {
  const spacingMap = {
    sm: undergroundTheme.spacing['2xl'],
    md: undergroundTheme.spacing['3xl'],
    lg: undergroundTheme.spacing['4xl'],
    xl: undergroundTheme.spacing['5xl'],
  };

  return (
    <section
      className={className}
      style={{
        marginBottom: spacingMap[spacing],
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: undergroundTheme.spacing.xl,
            gap: undergroundTheme.spacing.lg,
          }}
        >
          {title && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary,
                  marginBottom: subtitle ? undergroundTheme.spacing.xs : 0,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  style={{
                    margin: 0,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {actions && <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>{actions}</div>}
        </div>
      )}

      {children}
    </section>
  );
}
