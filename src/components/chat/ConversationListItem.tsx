import React from 'react';
import { tokens } from '../../styles/tokens';
import { formatTime } from './utils';

interface ConversationListItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
  onClick: () => void;
  isSelected?: boolean;
}

export function ConversationListItem({
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isOnline = false,
  isTyping = false,
  onClick,
  isSelected = false
}: ConversationListItemProps) {
  const hasUnread = unreadCount > 0;
  const userInitial = name[0]?.toUpperCase() || 'U';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: `1px solid ${tokens.colors.background.cardBorder}`,
        background: isSelected
          ? `${tokens.colors.brand.primary}15`
          : 'transparent',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = `${tokens.colors.brand.primary}08`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '700',
            color: '#fff',
            border: `2px solid ${
              hasUnread ? tokens.colors.brand.primary : 'transparent'
            }`
          }}
        >
          {!avatar && userInitial}
        </div>
        {isOnline && (
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#34c759',
              border: `3px solid ${tokens.colors.background.card}`,
              boxShadow: '0 2px 4px rgba(52, 199, 89, 0.4)'
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: hasUnread ? '700' : '600',
              color: tokens.colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {name}
          </h3>
          {lastMessageTime && (
            <span
              style={{
                fontSize: '12px',
                color: hasUnread
                  ? tokens.colors.brand.primary
                  : tokens.colors.subtle,
                flexShrink: 0,
                marginLeft: '8px',
                fontWeight: hasUnread ? '600' : '400'
              }}
            >
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: isTyping
                ? tokens.colors.brand.primary
                : hasUnread
                ? tokens.colors.text
                : tokens.colors.subtle,
              fontWeight: hasUnread ? '500' : '400',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              fontStyle: isTyping ? 'italic' : 'normal'
            }}
          >
            {isTyping ? 'מקליד...' : lastMessage || 'אין הודעות'}
          </p>

          {hasUnread && (
            <div
              style={{
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '10px',
                background: tokens.colors.brand.primary,
                color: '#fff',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
                flexShrink: 0
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
