import React from 'react';
import { colors } from '../../design-system';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  color?: string;
  children: React.ReactNode;
}

export function Icon({
  size = 24,
  color = colors.text.primary,
  children,
  style,
  ...props
}: IconProps) {
  const iconStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    color,
    flexShrink: 0,
    ...style,
  };

  return (
    <span style={iconStyles} {...props}>
      {children}
    </span>
  );
}
