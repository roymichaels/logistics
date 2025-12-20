import React from 'react';
import { spacing } from '../../styles/design-system/tokens';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  mobilePadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  padding = 'md',
  mobilePadding,
  centered = true,
  style,
  className = '',
}: ResponsiveContainerProps) {
  const maxWidthMap: Record<string, string> = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  };

  const finalMobilePadding = mobilePadding || (padding === 'xl' || padding === 'lg' ? 'md' : padding);

  const containerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: maxWidthMap[maxWidth],
    margin: centered ? '0 auto' : '0',
    overflowX: 'hidden',
    ...style,
  };

  if (padding !== 'none') {
    containerStyles.paddingLeft = `var(--spacing-${finalMobilePadding}, ${spacing[finalMobilePadding]})`;
    containerStyles.paddingRight = `var(--spacing-${finalMobilePadding}, ${spacing[finalMobilePadding]})`;
  }

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .responsive-container {
            padding-left: var(--spacing-${padding}, ${spacing[padding]}) !important;
            padding-right: var(--spacing-${padding}, ${spacing[padding]}) !important;
          }
        }
      `}</style>
      <div
        className={`responsive-container ${className}`.trim()}
        style={containerStyles}
      >
        {children}
      </div>
    </>
  );
}
