import React from 'react';
import { useTheme } from '../../theme/tokens';
import { appTokens } from '../../theme/app/tokens';

export type ButtonProps = {
  children?: React.ReactNode;
  variant?: 'solid' | 'ghost' | 'outline' | 'telegram' | 'twitter' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  tx?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  size = 'md',
  style,
  tx = false,
  ...rest
}) => {
  const base = useTheme();
  const t = tx ? appTokens : base;

  const sizeMap = {
    sm: { padding: `${t.spacing.xs} ${t.spacing.sm}`, fontSize: tx ? t.typography.size.sm : base.typography.size.sm },
    md: { padding: `${t.spacing.sm} ${t.spacing.md}`, fontSize: tx ? t.typography.size.md : base.typography.size.md },
    lg: { padding: `${t.spacing.md} ${t.spacing.lg}`, fontSize: tx ? t.typography.size.lg : base.typography.size.lg },
  };

  const variantMap: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    solid: {
      background: tx ? t.colors.gradient : `linear-gradient(135deg, ${base.colors.primary}, ${base.colors.secondary})`,
      color: '#0b1020',
      border: 'none',
      boxShadow: tx ? t.shadows.md : base.shadows.md,
    },
    primary: {
      background: `linear-gradient(135deg, ${base.colors.primary}, ${base.colors.secondary})`,
      color: '#0b1020',
      border: 'none',
    },
    secondary: {
      background: base.colors.panel,
      color: base.colors.text,
      border: `1px solid ${base.colors.border}`,
    },
    ghost: {
      background: 'transparent',
      color: tx ? t.colors.text : base.colors.text,
      border: `1px solid ${tx ? 'rgba(255,255,255,0.08)' : base.colors.border}`,
    },
    outline: {
      background: 'transparent',
      color: tx ? t.colors.text : base.colors.text,
      border: `1px solid ${tx ? t.colors.border : base.colors.border}`,
    },
    telegram: {
      background: '#1d9bf0',
      color: '#0f141a',
      border: 'none',
      boxShadow: '0 12px 28px rgba(29,155,240,0.25)',
    },
    twitter: {
      background: '#1d9bf0',
      color: '#fff',
      border: 'none',
      boxShadow: '0 10px 26px rgba(29,155,240,0.25)',
    },
  };

  const styles: React.CSSProperties = {
    borderRadius: tx ? t.radius.md : base.radius.md,
    fontWeight: tx ? t.typography.weight.bold : base.typography.weight.bold,
    transition: tx ? t.motion.base : base.transitions.base,
    cursor: 'pointer',
    border: 'none',
    ...sizeMap[size],
    ...variantMap[variant],
    ...style,
  };

  return (
    <button style={styles} {...rest}>
      {children ?? 'Button'}
    </button>
  );
};
