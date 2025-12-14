import React from 'react';
import { ROYAL_COLORS } from '../../styles/royalTheme';

type ChatTab = 'conversations' | 'groups' | 'users';

interface ChatTabsProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  unreadCount?: number;
}

export function ChatTabs({ activeTab, onTabChange, unreadCount = 0 }: ChatTabsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      borderBottom: `2px solid ${ROYAL_COLORS.cardBorder}`,
      paddingBottom: '12px'
    }}>
      <TabButton
        label="שיחות"
        icon="💬"
        active={activeTab === 'conversations'}
        count={unreadCount}
        onClick={() => onTabChange('conversations')}
      />
      <TabButton
        label="קבוצות"
        icon="👥"
        active={activeTab === 'groups'}
        onClick={() => onTabChange('groups')}
      />
      <TabButton
        label="משתמשים"
        icon="🔍"
        active={activeTab === 'users'}
        onClick={() => onTabChange('users')}
      />
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  count,
  onClick
}: {
  label: string;
  icon: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 16px',
        background: active ? ROYAL_COLORS.gradientPurple : 'transparent',
        border: 'none',
        borderRadius: '12px',
        color: active ? '#fff' : ROYAL_COLORS.muted,
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: active ? ROYAL_COLORS.glowPurple : 'none',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
      {count && count > 0 ? (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          background: '#ff3b30',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '700',
          minWidth: '20px',
          textAlign: 'center'
        }}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}
