import React from 'react';
import { useTheme } from '../../theme/tokens';
import { appTokens } from '../../theme/app/tokens';

export type CardProps = {
  children?: React.ReactNode;
  tx?: boolean;
  clickable?: boolean;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
};

export const Card: React.FC<CardProps> = ({ children, tx = false, clickable = false, style, className, ...rest }) => {
  const base = useTheme();
  const t = tx ? appTokens : base;
  const Element: any = rest.as || (rest.href ? 'a' : rest.asElement || 'div');

  return (
    <Element
      className={className}
      style={{
        background: tx ? t.colors.card : base.colors.panel,
        borderRadius: tx ? t.radius.lg : base.radius.md,
        boxShadow: tx ? t.shadows.md : base.shadows.sm,
        border: `1px solid ${tx ? t.colors.border : base.colors.border}`,
        padding: tx ? `${t.spacing.md}` : undefined,
        transition: tx ? t.motion.base : base.transitions.base,
        cursor: clickable ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children ?? 'Card'}
    </Element>
  );
};
