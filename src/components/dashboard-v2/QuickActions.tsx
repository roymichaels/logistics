import React from 'react';
import { QuickActionsProps } from './types';

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none'
  },
  secondary: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb'
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none'
  }
};

export function QuickActions({
  actions,
  layout = 'grid',
  columns = 3
}: QuickActionsProps) {
  const containerStyle: React.CSSProperties = {
    display: layout === 'grid' ? 'grid' : 'flex',
    gridTemplateColumns: layout === 'grid' ? `repeat(auto-fit, minmax(150px, 1fr))` : undefined,
    flexDirection: layout === 'list' ? 'column' : undefined,
    gap: '12px',
    marginBottom: '24px'
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    outline: 'none'
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle}>
      {actions.map((action) => {
        const variant = action.variant || 'primary';
        const buttonStyle = {
          ...buttonBaseStyle,
          ...variantStyles[variant],
          opacity: action.disabled ? 0.5 : 1,
          cursor: action.disabled ? 'not-allowed' : 'pointer'
        };

        return (
          <button
            key={action.id}
            style={buttonStyle}
            onClick={action.onClick}
            disabled={action.disabled}
            onMouseEnter={(e) => {
              if (!action.disabled) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!action.disabled) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }
            }}
          >
            {action.icon && <span>{action.icon}</span>}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
