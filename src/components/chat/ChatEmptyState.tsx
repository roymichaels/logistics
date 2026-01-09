import React from 'react';
import { tokens } from '../../styles/tokens';

interface ChatEmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ChatEmptyState({ icon, title, message, action }: ChatEmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 20px',
      color: tokens.colors.text.secondary
    }}>
      <div style={{ fontSize: '72px', marginBottom: '20px', opacity: 0.5 }}>{icon}</div>
      <h3 style={{ margin: '0 0 12px 0', color: tokens.colors.text.primary, fontSize: '20px', fontWeight: '600' }}>
        {title}
      </h3>
      <div style={{ fontSize: '15px', marginBottom: action ? '32px' : '0', lineHeight: '1.5', maxWidth: '400px', margin: '0 auto' }}>
        {message}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '12px 28px',
            borderRadius: '24px',
            border: 'none',
            background: tokens.colors.brand.primary,
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.background = tokens.colors.brand.primaryHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = tokens.colors.brand.primary;
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
