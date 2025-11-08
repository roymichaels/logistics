import React from 'react';
import { colors, spacing, borderRadius, shadows, transitions, typography } from '../../styles/design-system';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing;
  hoverable?: boolean;
  noPadding?: boolean;
  interactive?: boolean;
}

export function Card({
  variant = 'default',
  padding = 'lg',
  hoverable = false,
  noPadding = false,
  interactive = false,
  children,
  style,
  className,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: colors.ui.card,
      border: `1px solid ${colors.border.primary}`,
      boxShadow: 'none',
    },
    elevated: {
      background: colors.ui.card,
      boxShadow: shadows.sm,
      border: `1px solid ${colors.border.secondary}`,
    },
    outlined: {
      background: 'transparent',
      border: `1px solid ${colors.border.primary}`,
      boxShadow: 'none',
    },
    flat: {
      background: colors.ui.card,
      border: 'none',
      boxShadow: 'none',
    },
  };

  const getInteractiveStyles = (): React.CSSProperties => {
    if (!hoverable && !interactive) return {};

    if (isPressed) {
      return {
        transform: 'scale(0.98)',
        background: colors.background.tertiary,
      };
    }

    if (isHovered) {
      return {
        background: colors.ui.cardHover,
        border: variant !== 'flat' ? `1px solid ${colors.border.hover}` : 'none',
        boxShadow: variant === 'elevated' ? shadows.md : shadows.sm,
      };
    }

    return {};
  };

  const cardStyles: React.CSSProperties = {
    borderRadius: borderRadius.xl,
    padding: noPadding ? 0 : spacing[padding],
    transition: `all ${transitions.normal}`,
    cursor: hoverable || interactive ? 'pointer' : 'default',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...variantStyles[variant],
    ...getInteractiveStyles(),
    ...style,
  };

  return (
    <div
      style={cardStyles}
      className={className}
      onMouseEnter={() => (hoverable || interactive) && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => interactive && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => interactive && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
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
  noBorder?: boolean;
}

export function CardHeader({ title, subtitle, action, noBorder = false }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
        paddingBottom: noBorder ? 0 : spacing.md,
        borderBottom: noBorder ? 'none' : `1px solid ${colors.border.primary}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: subtitle ? spacing.xs : 0,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.normal,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ marginLeft: spacing.md }}>{action}</div>}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: keyof typeof spacing;
}

export function CardContent({ spacing: spacingSize = 'md', children, style, ...props }: CardContentProps) {
  return (
    <div
      style={{
        padding: `${spacing[spacingSize]} 0`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  noBorder?: boolean;
}

export function CardFooter({ noBorder = false, children, style, ...props }: CardFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.md,
        paddingTop: spacing.md,
        marginTop: spacing.md,
        borderTop: noBorder ? 'none' : `1px solid ${colors.border.primary}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
