import React from 'react';
import { tokens } from '../../theme/tokens';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  badge?: string | number;
  disabled?: boolean;
  description?: string;
}

export interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: number;
  title?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function QuickActionGrid({
  actions,
  columns = 2,
  title,
  compact = false,
  className,
  style,
}: QuickActionGridProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: 700,
            color: tokens.colors.text.primary,
          }}
        >
          {title}
        </h3>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: compact ? '12px' : '16px',
        }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? '8px' : '12px',
              padding: compact ? '16px' : '24px',
              backgroundColor: tokens.colors.background.primary,
              border: `1px solid ${tokens.colors.neutral[200]}`,
              borderRadius: '12px',
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              opacity: action.disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={(e) => {
              if (!action.disabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${tokens.colors.neutral[900]}10`;
                e.currentTarget.style.borderColor = tokens.colors.primary[300];
              }
            }}
            onMouseLeave={(e) => {
              if (!action.disabled) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = tokens.colors.neutral[200];
              }
            }}
          >
            {action.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: tokens.colors.background.primary,
                  backgroundColor: tokens.colors.semantic.error,
                  borderRadius: '10px',
                }}
              >
                {action.badge}
              </span>
            )}

            <div
              style={{
                fontSize: compact ? '32px' : '40px',
                lineHeight: 1,
              }}
            >
              {action.icon}
            </div>

            <div style={{ width: '100%' }}>
              <div
                style={{
                  fontSize: compact ? '13px' : '14px',
                  fontWeight: 600,
                  color: tokens.colors.text.primary,
                  marginBottom: action.description ? '4px' : 0,
                }}
              >
                {action.label}
              </div>

              {action.description && (
                <div
                  style={{
                    fontSize: '12px',
                    color: tokens.colors.text.secondary,
                    lineHeight: '1.4',
                  }}
                >
                  {action.description}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
