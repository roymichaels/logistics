import React from 'react';
import clsx from 'clsx';

type SwissGridProps = {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
};

/**
 * SwissGrid
 * A responsive grid that auto-adjusts columns for common breakpoints.
 */
export const SwissGrid: React.FC<SwissGridProps> = ({
  columns = 3,
  gap = 'md',
  className,
  children,
}) => {
  const gapClass =
    gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';

  const baseCols =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      : columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1';

  return (
    <div className={clsx('grid w-full', baseCols, gapClass, className)}>
      {children}
    </div>
  );
};

