import React from 'react';
import { colors, typography, spacing } from '../../design-system';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption';
  color?: keyof typeof colors.text | string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

export function Text({
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  as,
  children,
  style,
  ...props
}: TextProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    h1: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      marginBottom: spacing[5],
    },
    h2: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      marginBottom: spacing[4],
    },
    h3: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
      marginBottom: spacing[3],
    },
    h4: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.normal,
      marginBottom: spacing[3],
    },
    body: {
      fontSize: typography.fontSize.base,
      lineHeight: typography.lineHeight.normal,
    },
    small: {
      fontSize: typography.fontSize.sm,
      lineHeight: typography.lineHeight.normal,
    },
    caption: {
      fontSize: typography.fontSize.xs,
      lineHeight: typography.lineHeight.normal,
      color: colors.text.secondary,
    },
  };

  const getColor = () => {
    if (color in colors.text) {
      return colors.text[color as keyof typeof colors.text];
    }
    return color;
  };

  const defaultTag: Record<string, string> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    body: 'p',
    small: 'span',
    caption: 'span',
  };

  const Element = as || (defaultTag[variant] as keyof JSX.IntrinsicElements);

  const combinedStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    fontFamily: typography.fontFamily.primary,
    ...variantStyles[variant],
    color: getColor(),
    fontWeight: typography.fontWeight[weight],
    textAlign: align,
    ...style,
  };

  return React.createElement(Element, { style: combinedStyles, ...props }, children);
}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ required, children, style, ...props }: LabelProps) {
  const labelStyles: React.CSSProperties = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.primary,
    ...style,
  };

  return (
    <label style={labelStyles} {...props}>
      {children}
      {required && (
        <span style={{ color: colors.status.error, marginLeft: spacing[1] }}>*</span>
      )}
    </label>
  );
}
