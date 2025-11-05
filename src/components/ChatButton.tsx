import React from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';

interface ChatButtonProps {
  userId: string;
  userName: string;
  onStartChat: (userId: string, userName: string) => void;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}

export function ChatButton({ userId, userName, onStartChat, icon = '💬', size = 'medium' }: ChatButtonProps) {
  const sizes = {
    small: { padding: '6px 12px', fontSize: '13px', iconSize: '14px' },
    medium: { padding: '10px 16px', fontSize: '14px', iconSize: '16px' },
    large: { padding: '12px 20px', fontSize: '16px', iconSize: '18px' }
  };

  const { padding, fontSize, iconSize } = sizes[size];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onStartChat(userId, userName);
      }}
      style={{
        padding,
        borderRadius: '12px',
        border: `1px solid ${ROYAL_COLORS.accent}40`,
        background: `${ROYAL_COLORS.accent}15`,
        color: ROYAL_COLORS.accent,
        fontSize,
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${ROYAL_COLORS.accent}25`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 155, 240, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${ROYAL_COLORS.accent}15`;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span style={{ fontSize: iconSize }}>{icon}</span>
      <span>שלח הודעה</span>
    </button>
  );
}
