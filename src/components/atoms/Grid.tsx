import React from 'react';
import { spacing } from '../../design-system';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number | { sm?: number; md?: number; lg?: number };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  rows?: number;
  autoFit?: boolean;
  minItemWidth?: string;
}

export function Grid({
  columns = 1,
  gap = 'md',
  rows,
  autoFit = false,
  minItemWidth = '250px',
  children,
  style,
  ...props
}: GridProps) {
  const gapMap: Record<string, string> = {
    sm: spacing[2],
    md: spacing[4],
    lg: spacing[6],
    xl: spacing[8],
  };

  const getGridTemplateColumns = () => {
    if (autoFit) {
      return `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`;
    }
    if (typeof columns === 'number') {
      return `repeat(${columns}, 1fr)`;
    }
    return undefined;
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridTemplateColumns(),
    gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined,
    gap: gapMap[gap],
    ...style,
  };

  return (
    <div style={gridStyles} {...props}>
      {children}
    </div>
  );
}
