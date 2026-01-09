import React from 'react';
import { tokens } from '../../styles/tokens';

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
      gap: '0',
      marginBottom: '16px',
      borderBottom: `1px solid ${tokens.colors.divider}`,
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
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `3px solid ${tokens.colors.brand.primary}` : '3px solid transparent',
        color: active ? tokens.colors.text.primary : tokens.colors.text.secondary,
        fontSize: '15px',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        marginBottom: '-1px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.color = tokens.colors.text.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = tokens.colors.text.secondary;
        }
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span>{label}</span>
      {count && count > 0 ? (
        <span style={{
          padding: '2px 6px',
          borderRadius: '10px',
          background: tokens.colors.error,
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          minWidth: '18px',
          textAlign: 'center'
        }}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}
