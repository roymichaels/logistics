import React from 'react';
import { spacing, colors } from '../../design-system';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'transparent' | 'card' | 'surface';
  fullWidth?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}

export function Section({
  spacing: spacingSize = 'md',
  background = 'transparent',
  fullWidth = false,
  as = 'section',
  children,
  style,
  ...props
}: SectionProps) {
  const spacingMap: Record<string, string> = {
    none: '0',
    sm: spacing[2],
    md: spacing[4],
    lg: spacing[6],
    xl: spacing[8],
  };

  const backgroundMap: Record<string, string> = {
    transparent: 'transparent',
    card: colors.ui.card,
    surface: colors.ui.surface,
  };

  const sectionStyles: React.CSSProperties = {
    padding: spacingMap[spacingSize],
    background: backgroundMap[background],
    width: fullWidth ? '100%' : 'auto',
    ...style,
  };

  return React.createElement(as, { style: sectionStyles, ...props }, children);
}
