import React from 'react';
import { Typography } from '../atoms/Typography';
import { colors, spacing } from '../../design-system';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  divider?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  icon,
  divider = true,
}: SectionHeaderProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    paddingBottom: divider ? spacing[3] : 0,
    borderBottom: divider ? `1px solid ${colors.border.primary}` : 'none',
  };

  const leftSideStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  };

  const textContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };

  return (
    <div style={containerStyles}>
      <div style={leftSideStyles}>
        {icon && <div>{icon}</div>}

        <div style={textContainerStyles}>
          <Typography
            variant="h3"
            style={{
              color: colors.text.primary,
              margin: 0,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body"
              style={{
                color: colors.text.secondary,
                fontSize: '14px',
                margin: 0,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </div>
      </div>

      {actions && <div>{actions}</div>}
    </div>
  );
}
