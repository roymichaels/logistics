import React from 'react';
import { Card } from './Card';
import { Typography } from '../atoms/Typography';
import { colors, spacing } from '../../styles/design-system';

interface SettingsCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function SettingsCard({
  title,
  description,
  children,
  icon,
  rightContent,
  onClick,
  style
}: SettingsCardProps) {
  const hasInteraction = !!onClick;

  return (
    <Card
      hoverable={hasInteraction}
      interactive={hasInteraction}
      onClick={onClick}
      style={style}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        width: '100%'
      }}>
        {icon && (
          <div style={{
            flexShrink: 0,
            color: colors.text.secondary,
            marginTop: '2px'
          }}>
            {icon}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: children ? '12px' : 0 }}>
            <Typography variant="h4" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body" style={{ fontSize: '14px', opacity: 0.7 }}>
                {description}
              </Typography>
            )}
          </div>
          {children}
        </div>

        {rightContent && (
          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            marginTop: '2px'
          }}>
            {rightContent}
          </div>
        )}
      </div>
    </Card>
  );
}
