import React from 'react';
import { ROYAL_COLORS } from '../../styles/royalTheme';

interface ChatHeaderProps {
  title: string;
  canCreateGroup?: boolean;
  showCreateMenu: boolean;
  onCreateMenuToggle: () => void;
  onHaptic: () => void;
}

export function ChatHeader({ title, canCreateGroup, showCreateMenu, onCreateMenuToggle, onHaptic }: ChatHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      position: 'relative'
    }}>
      <h1 style={{
        margin: '0',
        fontSize: '28px',
        fontWeight: '700',
        color: ROYAL_COLORS.text,
        textShadow: '0 0 20px rgba(29, 155, 240, 0.5)'
      }}>
        {title}
      </h1>
      {canCreateGroup && (
        <button
          onClick={() => {
            onHaptic();
            onCreateMenuToggle();
          }}
          style={{
            padding: '8px 14px',
            borderRadius: '12px',
            border: 'none',
            background: ROYAL_COLORS.gradientPurple,
            color: '#fff',
            fontSize: '28px',
            fontWeight: '300',
            cursor: 'pointer',
            boxShadow: ROYAL_COLORS.glowPurple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            flexShrink: 0,
            lineHeight: 1
          }}
          title="יצירת קבוצה או ערוץ"
        >
          +
        </button>
      )}
    </div>
  );
}
