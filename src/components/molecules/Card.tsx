import React from 'react';
import { colors, spacing, borderRadius, shadows, transitions } from '../../styles/design-system';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
  hoverable?: boolean;
  noPadding?: boolean;
}

export function Card({
  variant = 'default',
  padding = '2xl',
  hoverable = false,
  noPadding = false,
  children,
  style,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: colors.ui.card,
      border: `1px solid ${colors.border.primary}`,
      boxShadow: 'none',
    },
    elevated: {
      background: colors.ui.card,
      boxShadow: shadows.md,
      border: `1px solid ${colors.border.secondary}`,
    },
    outlined: {
      background: 'transparent',
      border: `1px solid ${colors.border.primary}`,
      boxShadow: 'none',
    },
  };

  const cardStyles: React.CSSProperties = {
    borderRadius: borderRadius.xl, // 16px - Twitter card radius
    padding: noPadding ? 0 : spacing[padding],
    transition: transitions.normal,
    cursor: hoverable ? 'pointer' : 'default',
    ...variantStyles[variant],
    ...(hoverable && isHovered
      ? {
          background: colors.ui.cardHover,
          border: `1px solid ${colors.border.hover}`,
          boxShadow: shadows.md,
          transform: 'scale(1.01)',
        }
      : {}),
    ...style,
  };

  return (
    <div
      style={cardStyles}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: colors.text.primary,
            marginBottom: subtitle ? spacing.xs : 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: colors.text.secondary,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
