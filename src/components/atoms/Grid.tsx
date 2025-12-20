import React from 'react';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rows?: number;
  autoFit?: boolean;
  minItemWidth?: string;
  variant?: 'default' | 'products';
}

export function Grid({
  columns = 1,
  gap = 'lg',
  rows,
  autoFit = false,
  minItemWidth = '250px',
  variant,
  children,
  style,
  className = '',
  ...props
}: GridProps) {
  const gridClasses = ['grid'];

  if (variant === 'products') {
    gridClasses.push('grid--products');
  }

  if (typeof columns === 'number' && !variant) {
    gridClasses.push(`grid--${columns}-col`);
  }

  const gridStyles: React.CSSProperties = {
    gap: `var(--spacing-${gap})`,
    ...style,
  };

  if (autoFit && !variant) {
    gridStyles.gridTemplateColumns = `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`;
  }

  if (rows) {
    gridStyles.gridTemplateRows = `repeat(${rows}, 1fr)`;
  }

  return (
    <div
      className={`${gridClasses.join(' ')} ${className}`.trim()}
      style={gridStyles}
      {...props}
    >
      {children}
    </div>
  );
}
