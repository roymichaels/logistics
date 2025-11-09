/**
 * EmptyState Component
 * Consistent empty state for dashboard sections
 */

import React from 'react';
import { colors, spacing, typography, borderRadius, components } from '../../styles/theme';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center' as const,
      padding: `${spacing['5xl']} ${spacing.xl}`,
      color: colors.text.secondary,
    }}>
      {icon && (
        <div style={{
          fontSize: '64px',
          marginBottom: spacing.lg,
          opacity: 0.5,
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        margin: 0,
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: description ? spacing.sm : 0,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          margin: 0,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: action ? spacing.xl : 0,
          lineHeight: typography.lineHeight.relaxed,
        }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            ...components.button.primary,
            marginTop: spacing.lg,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
