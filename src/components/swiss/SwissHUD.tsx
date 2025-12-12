import React from 'react';

type Props = {
  title?: React.ReactNode;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  className?: string;
};

/**
 * Minimal micro topbar that can compress on scroll (future).
 * Currently static and lightweight.
 */
export const SwissHUD: React.FC<Props> = ({ title, rightSlot, leftSlot, className }) => {
  return (
    <header
      className={className}
      data-swiss-hud
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        backdropFilter: 'blur(12px)',
        background: 'rgba(15,18,24,0.72)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{leftSlot}</div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{rightSlot}</div>
    </header>
  );
};

export default SwissHUD;
