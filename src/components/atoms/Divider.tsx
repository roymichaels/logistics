import React from 'react';
import { colors, spacing } from '../../styles/design-system';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: keyof typeof spacing;
  color?: string;
}

export function Divider({
  orientation = 'horizontal',
  spacing: spacingKey = 'lg',
  color = colors.border.primary,
}: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  const dividerStyles: React.CSSProperties = {
    background: color,
    margin: isHorizontal ? `${spacing[spacingKey]} 0` : `0 ${spacing[spacingKey]}`,
    ...(isHorizontal
      ? { width: '100%', height: '1px' }
      : { height: '100%', width: '1px' }),
  };

  return <div style={dividerStyles} />;
}
