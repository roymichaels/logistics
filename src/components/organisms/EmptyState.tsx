import React from 'react';
import { colors, spacing } from '../../styles/design-system';
import { Text, Button } from '../atoms';
import { Card } from '../molecules';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <div
        style={{
          textAlign: 'center',
          padding: `${spacing['5xl']} ${spacing['2xl']}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        <div style={{ fontSize: '64px', opacity: 0.5 }}>{icon}</div>
        <Text variant="h3" color="primary">
          {title}
        </Text>
        {description && (
          <Text color="secondary" align="center" style={{ maxWidth: '400px' }}>
            {description}
          </Text>
        )}
        {action && (
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
