import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from './UndergroundCard';
import { UndergroundButton } from './UndergroundButton';

interface UndergroundEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

export function UndergroundEmptyState({ icon, title, description, action }: UndergroundEmptyStateProps) {
  return (
    <UndergroundCard>
      <div
        style={{
          textAlign: 'center',
          padding: `${undergroundTheme.spacing['5xl']} ${undergroundTheme.spacing.xl}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: undergroundTheme.spacing.xl,
        }}
      >
        {icon && (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: undergroundTheme.borderRadius['2xl'],
              background: undergroundTheme.colors.glassmorphism.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: undergroundTheme.colors.text.tertiary,
              fontSize: '40px',
            }}
          >
            {icon}
          </div>
        )}

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.sm,
            }}
          >
            {title}
          </h3>

          {description && (
            <p
              style={{
                margin: 0,
                fontSize: undergroundTheme.typography.fontSize.base,
                color: undergroundTheme.colors.text.secondary,
                maxWidth: '400px',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {action && (
          <UndergroundButton onClick={action.onClick} icon={action.icon}>
            {action.label}
          </UndergroundButton>
        )}
      </div>
    </UndergroundCard>
  );
}
