import React from 'react';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number | { mobile?: number; tablet?: number; desktop?: number };
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

  if (typeof columns === 'object' && !variant) {
    if (columns.mobile) {
      gridStyles.gridTemplateColumns = `repeat(${columns.mobile}, 1fr)`;
    }
    if (columns.tablet || columns.desktop) {
      const mediaStyles: string[] = [];

      if (columns.tablet) {
        mediaStyles.push(`
          @media (min-width: 640px) {
            grid-template-columns: repeat(${columns.tablet}, 1fr);
          }
        `);
      }

      if (columns.desktop) {
        mediaStyles.push(`
          @media (min-width: 1024px) {
            grid-template-columns: repeat(${columns.desktop}, 1fr);
          }
        `);
      }

      if (mediaStyles.length > 0) {
        const uniqueId = `grid-${Math.random().toString(36).substr(2, 9)}`;
        gridClasses.push(uniqueId);

        const styleEl = document.createElement('style');
        styleEl.textContent = `.${uniqueId} { ${mediaStyles.join(' ')} }`;
        document.head.appendChild(styleEl);
      }
    }
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
