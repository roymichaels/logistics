import React from 'react';

type ListItemProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  end?: React.ReactNode;
  onClick?: () => void;
  compact?: boolean;
};

export const SGListItem: React.FC<ListItemProps> = ({ title, subtitle, icon, end, onClick, compact }) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {icon && <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center' }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#e8ecf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        {subtitle && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{subtitle}</div>}
      </div>
      {end}
    </div>
  );
};

export default SGListItem;
