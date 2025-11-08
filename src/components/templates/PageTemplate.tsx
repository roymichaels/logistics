import React from 'react';
import { colors, spacing } from '../../styles/design-system';
import { Text } from '../atoms';

export interface PageTemplateProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
}

export function PageTemplate({
  title,
  subtitle,
  actions,
  children,
  maxWidth = '1200px',
  noPadding = false,
}: PageTemplateProps) {
  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    padding: noPadding ? 0 : spacing['2xl'],
    paddingBottom: noPadding ? 0 : '100px',
  };

  const contentStyles: React.CSSProperties = {
    maxWidth,
    margin: '0 auto',
  };

  const headerStyles: React.CSSProperties = {
    marginBottom: spacing['3xl'],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.lg,
  };

  return (
    <div style={containerStyles}>
      <div style={contentStyles}>
        {(title || actions) && (
          <div style={headerStyles}>
            <div>
              {title && (
                <Text variant="h1" style={{ marginBottom: subtitle ? spacing.xs : 0 }}>
                  {title}
                </Text>
              )}
              {subtitle && <Text color="secondary">{subtitle}</Text>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
