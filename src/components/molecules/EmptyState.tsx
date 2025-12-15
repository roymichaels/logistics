import React from 'react';
import { Text } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { colors, spacing, typography } from '../../styles/design-system';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const iconMap = {
    default: '📦',
    search: '🔍',
    error: '⚠️',
  };

  const defaultIcon = icon || iconMap[variant];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing['4xl']} ${spacing.lg}`,
    textAlign: 'center',
    minHeight: '300px',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '64px',
    marginBottom: spacing.xl,
    opacity: 0.6,
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}>{defaultIcon}</div>

      <Text
        variant="h2"
        style={{
          color: colors.text.primary,
          marginBottom: spacing.sm,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {title}
      </Text>

      {description && (
        <Text
          variant="body"
          style={{
            color: colors.text.secondary,
            marginBottom: spacing.xl,
            maxWidth: '400px',
            fontSize: typography.fontSize.base,
          }}
        >
          {description}
        </Text>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant="primary"
          size="medium"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
