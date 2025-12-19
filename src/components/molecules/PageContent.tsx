import React from 'react';

export interface PageContentProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function PageContent({
  children,
  maxWidth = 'xl',
  padding = 'md',
  centered = true,
  style,
  className = '',
}: PageContentProps) {
  const maxWidthMap: Record<string, string> = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: 'var(--container-max-width)',
    full: '100%',
  };

  const containerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: maxWidthMap[maxWidth],
    margin: centered ? '0 auto' : '0',
    overflowX: 'hidden',
    ...style,
  };

  if (padding === 'none') {
    containerStyles.padding = '0';
  } else {
    containerStyles.paddingLeft = `var(--spacing-${padding})`;
    containerStyles.paddingRight = `var(--spacing-${padding})`;
  }

  return (
    <div
      className={`page-body ${className}`.trim()}
      style={containerStyles}
    >
      {children}
    </div>
  );
}
