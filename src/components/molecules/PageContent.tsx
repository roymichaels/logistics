import React from 'react';
import { spacing } from '../../design-system';

export interface PageContentProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  style?: React.CSSProperties;
}

export function PageContent({
  children,
  maxWidth = 'xl',
  padding = 'lg',
  centered = false,
  style,
}: PageContentProps) {
  const maxWidthMap: Record<string, string> = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  };

  const paddingMap: Record<string, string> = {
    none: '0',
    sm: spacing[2],
    md: spacing[4],
    lg: spacing[6],
    xl: spacing[8],
  };

  const containerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: maxWidthMap[maxWidth],
    padding: paddingMap[padding],
    margin: centered ? '0 auto' : '0',
    ...style,
  };

  return <div style={containerStyles}>{children}</div>;
}
