import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Responsive row that wraps and spaces items nicely.
 */
export const SwissRow: React.FC<Props> = ({ children, className }) => {
  return (
    <div
      className={className}
      data-swiss-row
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default SwissRow;
