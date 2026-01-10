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
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error' | 'orders' | 'products' | 'users' | 'data';
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  size = 'md',
}: EmptyStateProps) {
  const iconMap = {
    default: '📦',
    search: '🔍',
    error: '⚠️',
    orders: '📋',
    products: '🛍️',
    users: '👥',
    data: '📊',
  };

  const sizeConfig = {
    sm: { iconSize: '48px', titleSize: typography.fontSize.lg, maxWidth: '300px', padding: spacing.xl },
    md: { iconSize: '64px', titleSize: typography.fontSize.xl, maxWidth: '400px', padding: spacing['4xl'] },
    lg: { iconSize: '80px', titleSize: typography.fontSize['2xl'], maxWidth: '500px', padding: spacing['5xl'] },
  };

  const config = sizeConfig[size];
  const defaultIcon = icon || iconMap[variant];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${config.padding} ${spacing.lg}`,
    textAlign: 'center',
    minHeight: '300px',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: config.iconSize,
    marginBottom: spacing.xl,
    opacity: 0.6,
  };

  return (
    <div style={containerStyle} role="status" aria-label="No content available">
      <div style={iconStyle}>{defaultIcon}</div>

      <Text
        variant="h2"
        style={{
          color: colors.text.primary,
          marginBottom: spacing.sm,
          fontSize: config.titleSize,
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
            marginBottom: action || secondaryAction ? spacing.xl : '0',
            maxWidth: config.maxWidth,
            fontSize: typography.fontSize.base,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          {description}
        </Text>
      )}

      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.lg }}>
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size="medium"
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="secondary"
              size="medium"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
