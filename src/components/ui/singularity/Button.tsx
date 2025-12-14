import React from 'react';
import { colors, borderRadius, typography, transitions } from '../../../styles/design-system/tokens';

type Variant = 'filled' | 'outline' | 'ghost' | 'soft' | 'destructive';
type Size = 'xs' | 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const SGButton: React.FC<Props> = ({ variant = 'filled', size = 'md', style, children, ...rest }) => {
  const padding =
    size === 'xs'
      ? '6px 10px'
      : size === 'sm'
      ? '8px 12px'
      : size === 'lg'
      ? '12px 18px'
      : '10px 14px';

  const baseStyle: React.CSSProperties = {
    border: `1px solid ${colors.transparent}`,
    borderRadius: parseInt(borderRadius.lg),
    background: colors.brand.primary,
    color: colors.background.elevated,
    fontWeight: parseInt(typography.fontWeight.bold),
    padding,
    cursor: 'pointer',
    transition: transitions.normal,
  };

  const styles: Record<Variant, React.CSSProperties> = {
    filled: baseStyle,
    outline: {
      ...baseStyle,
      background: colors.transparent,
      color: colors.text.primary,
      borderColor: colors.border.primary
    },
    ghost: {
      ...baseStyle,
      background: colors.transparent,
      color: colors.text.primary,
      borderColor: colors.transparent
    },
    soft: {
      ...baseStyle,
      background: colors.brand.primaryFaded,
      color: colors.brand.primary
    },
    destructive: {
      ...baseStyle,
      background: colors.status.error,
      color: colors.white
    },
  };

  return (
    <button style={{ ...styles[variant], ...style }} {...rest}>
      {children}
    </button>
  );
};

export default SGButton;
