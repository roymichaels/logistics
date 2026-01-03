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
      ...styles.emptyState.container,
      padding: '60px 20px',
      borderRadius: '16px',
      background: tokens.colors.background.card
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ margin: '0 0 12px 0', color: tokens.colors.text, fontSize: '20px' }}>
        {title}
      </h3>
      <div style={{ ...styles.emptyState.containerText, fontSize: '15px', marginBottom: action ? '24px' : '0' }}>
        {message}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '14px 32px',
            borderRadius: '12px',
            border: 'none',
            background: tokens.gradients.primary,
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: tokens.glows.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(29, 155, 240, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = tokens.glows.primary;
          }}
        >
          <span style={{ fontSize: '20px' }}>+</span>
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
