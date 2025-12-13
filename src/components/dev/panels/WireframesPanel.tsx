import React from 'react';
import { useNavigate } from 'react-router-dom';

const wireframes = [
  { id: 'header', label: 'Header', status: 'ready', path: '/sandbox' },
  { id: 'sidebar', label: 'Sidebar', status: 'ready', path: '/sandbox' },
  { id: 'bottom-nav', label: 'Bottom Navigation', status: 'ready', path: '/sandbox' },
  { id: 'card', label: 'Card', status: 'ready', path: '/sandbox' },
  { id: 'modal', label: 'Modal', status: 'ready', path: '/sandbox' },
  { id: 'drawer', label: 'Drawer', status: 'ready', path: '/sandbox' },
  { id: 'sheet', label: 'Sheet', status: 'in-progress', path: '/sandbox' },
  { id: 'popover', label: 'Popover', status: 'in-progress', path: '/sandbox' },
  { id: 'table', label: 'Table', status: 'planned', path: '/sandbox' },
];

export function WireframesPanel() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Component Wireframes
      </div>

      {wireframes.map((wireframe) => {
        const statusColors = {
          ready: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
          'in-progress': { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
          planned: { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748b' },
        };

        const colors = statusColors[wireframe.status as keyof typeof statusColors];

        return (
          <div
            key={wireframe.id}
            onClick={() => navigate(wireframe.path)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {wireframe.label}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {wireframe.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
