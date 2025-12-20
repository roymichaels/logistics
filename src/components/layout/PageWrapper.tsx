import React from 'react';

export interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: 'narrow' | 'standard' | 'wide' | 'ultra';
  padding?: boolean;
  centerContent?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PageWrapper - Constrains content width on large screens
 *
 * maxWidth options:
 * - 'narrow': 900px (forms, profiles)
 * - 'standard': 1100px (default pages)
 * - 'wide': 1300px (dashboards)
 * - 'ultra': 1500px (data-heavy pages)
 */
export function PageWrapper({
  children,
  maxWidth = 'standard',
  padding = true,
  centerContent = true,
  className,
  style,
}: PageWrapperProps) {
  const maxWidthMap = {
    narrow: '900px',
    standard: '1100px',
    wide: '1300px',
    ultra: '1500px',
  };

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: maxWidthMap[maxWidth],
    marginLeft: centerContent ? 'auto' : undefined,
    marginRight: centerContent ? 'auto' : undefined,
    paddingLeft: padding ? 'var(--spacing-lg)' : undefined,
    paddingRight: padding ? 'var(--spacing-lg)' : undefined,
    ...style,
  };

  return (
    <div style={wrapperStyle} className={className}>
      {children}
    </div>
  );
}
