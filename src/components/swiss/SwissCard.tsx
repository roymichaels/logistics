import React from 'react';
import { SwissMode } from './SwissContainer';

type Props = {
  children: React.ReactNode;
  mode?: SwissMode;
  interactive?: boolean;
  density?: 'comfortable' | 'compact';
  onClick?: () => void;
  className?: string;
};

/**
 * SwissCard can later morph between card, table-row, or compact chip.
 * Currently it is a styled div with data attributes for future theming.
 */
export const SwissCard: React.FC<Props> = ({
  children,
  mode = 'auto',
  interactive = true,
  density = 'comfortable',
  onClick,
  className,
}) => {
  return (
    <div
      className={className}
      data-swiss-card
      data-mode={mode}
      data-density={density}
      data-interactive={interactive}
      onClick={onClick}
      style={{
        borderRadius: 16,
        padding: density === 'compact' ? 10 : 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  );
};

export default SwissCard;
