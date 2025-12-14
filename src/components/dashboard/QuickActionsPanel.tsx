import React from 'react';
import { RoyalDashboardSnapshot } from '../../data/types';
import { TWITTER_COLORS } from '../../styles/twitterTheme';
import { shadows } from '../../styles/design-system';

interface QuickActionsPanelProps {
  snapshot: RoyalDashboardSnapshot;
  onExport: (format: 'csv' | 'json') => void;
}

export function QuickActionsPanel({ snapshot, onExport }: QuickActionsPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <ActionButton
        label="ייצוא CSV"
        icon="⬇️"
        onClick={() => onExport('csv')}
      />
      <ActionButton
        label="ייצוא JSON"
        icon="🧾"
        onClick={() => onExport('json')}
      />
    </div>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: TWITTER_COLORS.gradientPrimary,
        color: TWITTER_COLORS.white,
        padding: '14px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: TWITTER_COLORS.shadow
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
