import React from 'react';
import { Typography } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { colors, spacing } from '../../design-system';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  backButton?: {
    label?: string;
    onClick: () => void;
  };
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  backButton,
}: PageHeaderProps) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
    marginBottom: spacing[6],
    paddingBottom: spacing[4],
    borderBottom: `1px solid ${colors.border.primary}`,
  };

  const topRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  };

  const titleContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
    flex: 1,
  };

  const breadcrumbsStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    fontSize: '14px',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  };

  const backButtonStyles: React.CSSProperties = {
    marginRight: spacing[3],
  };

  return (
    <div style={containerStyles}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={breadcrumbsStyles}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.brand.primary,
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit',
                  }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span>{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={topRowStyles}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {backButton && (
            <div style={backButtonStyles}>
              <Button
                variant="ghost"
                size="small"
                onClick={backButton.onClick}
              >
                ← {backButton.label || 'Back'}
              </Button>
            </div>
          )}

          <div style={titleContainerStyles}>
            <Typography
              variant="h1"
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
    </div>
  );
}
