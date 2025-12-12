import React from 'react';

interface Props {
  status: 'verified' | 'pending' | 'unverified';
  label?: string;
}

export const KycBadge: React.FC<Props> = ({ status, label }) => {
  const isVerified = status === 'verified';
  const color = isVerified ? '#22c55e' : status === 'pending' ? '#eab308' : '#6b7280';
  const bg = isVerified ? 'rgba(34,197,94,0.12)' : status === 'pending' ? 'rgba(234,179,8,0.12)' : 'rgba(107,114,128,0.12)';
  const text = label || (isVerified ? 'Verified' : status === 'pending' ? 'Pending Verification' : 'Unverified');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        border: `1px solid ${color}33`,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 13
      }}
    >
      <span>{isVerified ? '✓' : status === 'pending' ? '⏳' : '🔒'}</span>
      <span>{text}</span>
    </div>
  );
};

export default KycBadge;
