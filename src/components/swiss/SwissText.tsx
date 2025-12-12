import React from 'react';
import clsx from 'clsx';

type SwissTextProps = {
  variant?: 'default' | 'muted' | 'label';
  clamp?: number;
  className?: string;
  children: React.ReactNode;
};

/**
 * SwissText
 * Adaptive text wrapper that handles truncation and wrapping safely.
 */
export const SwissText: React.FC<SwissTextProps> = ({
  variant = 'default',
  clamp,
  className,
  children,
}) => {
  return (
    <span
      className={clsx(
        'block overflow-hidden text-ellipsis',
        variant === 'muted' && 'text-white/60',
        variant === 'label' && 'text-white/80 text-sm font-medium',
        clamp && `line-clamp-${clamp}`,
        className,
      )}
      style={
        clamp
          ? {
              display: '-webkit-box',
              WebkitLineClamp: clamp,
              WebkitBoxOrient: 'vertical',
            }
          : undefined
      }
    >
      {children}
    </span>
  );
};

