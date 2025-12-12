import React from 'react';

type BadgeProps = {
  label: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
};

export const SGBadge: React.FC<BadgeProps> = ({ label, tone = 'neutral' }) => {
  const colors: Record<typeof tone, { bg: string; fg: string }> = {
    success: { bg: 'rgba(34,197,94,0.18)', fg: '#22c55e' },
    info: { bg: 'rgba(29,155,240,0.18)', fg: '#1d9bf0' },
    warning: { bg: 'rgba(234,179,8,0.18)', fg: '#eab308' },
    danger: { bg: 'rgba(239,68,68,0.18)', fg: '#ef4444' },
    neutral: { bg: 'rgba(255,255,255,0.08)', fg: '#e8ecf5' },
  };

  const c = colors[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontWeight: 700,
        border: `1px solid ${c.fg}33`,
      }}
    >
      {label}
    </span>
  );
};

export default SGBadge;
