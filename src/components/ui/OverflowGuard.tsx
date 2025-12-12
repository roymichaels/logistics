import React from 'react';

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

/**
 * Simple wrapper that prevents horizontal overflow leaks.
 */
export function OverflowGuard({ children, style }: Props) {
  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default OverflowGuard;
