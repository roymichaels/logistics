import React from 'react';

type Props = {
  children: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  height?: number | string;
  bottomSheet?: boolean;
  className?: string;
};

/**
  * Telegram-style bottom sheet placeholder.
  * No portal or focus trapping yet; purely structural.
  */
export const SwissSheet: React.FC<Props> = ({
  children,
  open = false,
  onClose,
  height = '70vh',
  bottomSheet = true,
  className,
}) => {
  if (!open) return null;

  return (
    <div
      data-swiss-sheet
      data-bottom-sheet={bottomSheet}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: bottomSheet ? 'flex-end' : 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          height: bottomSheet ? height : 'auto',
          background: 'var(--tx-card, #0f1623)',
          borderRadius: bottomSheet ? '18px 18px 0 0' : 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          padding: 16,
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
        {children}
      </div>
    </div>
  );
};

export default SwissSheet;
