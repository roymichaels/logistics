import React from 'react';
import { modernTokens } from '../../styles/modernTokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'flat' | 'glass';
  padding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
  hoverable?: boolean;
  noPadding?: boolean;
  interactive?: boolean;
  title?: string;
}

export function Card({
  variant = 'default',
  padding = 24,
  hoverable = false,
  noPadding = false,
  interactive = false,
  title,
  children,
  style,
  className,
  ...props
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: modernTokens.gradients.card,
      border: `1px solid ${modernTokens.colors.border.default}`,
      boxShadow: modernTokens.shadows.md,
      backdropFilter: 'blur(20px)',
    },
    elevated: {
      background: modernTokens.gradients.card,
      boxShadow: modernTokens.shadows.lg,
      border: `1px solid ${modernTokens.colors.border.default}`,
      backdropFilter: 'blur(20px)',
    },
    outlined: {
      background: 'transparent',
      border: `1px solid ${modernTokens.colors.border.strong}`,
      boxShadow: 'none',
    },
    flat: {
      background: modernTokens.colors.background.surface,
      border: 'none',
      boxShadow: 'none',
    },
    glass: {
      background: modernTokens.gradients.glass,
      border: `1px solid ${modernTokens.colors.border.subtle}`,
      backdropFilter: 'blur(20px)',
      boxShadow: modernTokens.shadows.md,
    },
  };

  const getInteractiveStyles = (): React.CSSProperties => {
    if (!hoverable && !interactive) return {};

    if (isPressed) {
      return {
        transform: 'scale(0.98)',
        background: modernTokens.gradients.cardHover,
      };
    }

    if (isHovered) {
      return {
        background: modernTokens.gradients.cardHover,
        border: variant !== 'flat' ? `1px solid ${modernTokens.colors.border.hover}` : 'none',
        boxShadow: variant === 'elevated' ? modernTokens.shadows.xl : modernTokens.shadows.lg,
        transform: 'translateY(-2px)',
      };
    }

    return {};
  };

  const cardStyles: React.CSSProperties = {
    borderRadius: modernTokens.radius.lg,
    padding: noPadding ? 0 : padding,
    transition: modernTokens.transitions.normal,
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
      {title && (
        <h3
          style={{
            margin: 0,
            marginBottom: modernTokens.spacing.lg,
            fontSize: modernTokens.typography.fontSize.xl,
            fontWeight: modernTokens.typography.fontWeight.bold,
            color: modernTokens.colors.text.primary,
          }}
        >
          {title}
        </h3>
      )}
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
        marginBottom: modernTokens.spacing.lg,
        paddingBottom: noBorder ? 0 : modernTokens.spacing.md,
        borderBottom: noBorder ? 'none' : `1px solid ${modernTokens.colors.border.default}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontSize: modernTokens.typography.fontSize.xl,
            fontWeight: modernTokens.typography.fontWeight.bold,
            color: modernTokens.colors.text.primary,
            marginBottom: subtitle ? modernTokens.spacing.xs : 0,
            lineHeight: modernTokens.typography.lineHeight.tight,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: modernTokens.typography.fontSize.sm,
              color: modernTokens.colors.text.secondary,
              lineHeight: modernTokens.typography.lineHeight.normal,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ marginLeft: modernTokens.spacing.md }}>{action}</div>}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
}

export function CardContent({ spacing = 12, children, style, ...props }: CardContentProps) {
  return (
    <div
      style={{
        padding: `${spacing}px 0`,
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
        gap: modernTokens.spacing.md,
        paddingTop: modernTokens.spacing.md,
        marginTop: modernTokens.spacing.md,
        borderTop: noBorder ? 'none' : `1px solid ${modernTokens.colors.border.default}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
