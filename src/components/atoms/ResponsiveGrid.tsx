import React from 'react';
import { spacing } from '../../styles/design-system/tokens';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  gap?: keyof typeof spacing;
  style?: React.CSSProperties;
  className?: string;
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 'lg',
  style,
  className = '',
}: ResponsiveGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: spacing[gap],
    gridTemplateColumns: `repeat(${columns.mobile || 1}, 1fr)`,
    ...style,
  };

  return (
    <div
      className={`responsive-grid ${className}`.trim()}
      style={gridStyle}
    >
      <style>{`
        @media (min-width: 768px) {
          .responsive-grid {
            grid-template-columns: repeat(${columns.tablet || 2}, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .responsive-grid {
            grid-template-columns: repeat(${columns.desktop || 3}, 1fr);
          }
        }
        @media (min-width: 1280px) {
          .responsive-grid {
            grid-template-columns: repeat(${columns.wide || 4}, 1fr);
          }
        }
      `}</style>
      {children}
    </div>
  );
}
