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
        padding: '14px 16px',
        cursor: 'pointer',
        borderBottom: `1px solid ${tokens.colors.border.muted}`,
        background: isSelected
          ? `${tokens.colors.brand.primary}18`
          : 'transparent',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = `${tokens.colors.brand.primary}10`;
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
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'linear-gradient(135deg, #1D9BF0, #7B3FF2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: '700',
            color: '#fff',
            border: hasUnread
              ? `3px solid ${tokens.colors.brand.primary}`
              : '2px solid rgba(255, 255, 255, 0.05)',
            boxShadow: hasUnread
              ? `0 0 0 4px ${tokens.colors.brand.primary}20`
              : '0 2px 8px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          }}
        >
          {!avatar && userInitial}
        </div>
        {isOnline && (
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#34c759',
              border: `3px solid ${tokens.colors.background.card}`,
              boxShadow: '0 2px 6px rgba(52, 199, 89, 0.5)'
            }}
          />
        )}
        {isTyping && (
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: tokens.colors.brand.primary,
              borderRadius: '12px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: '600',
              color: '#fff',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0, 132, 255, 0.4)'
            }}
          >
            ...
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: hasUnread ? '700' : '600',
              color: tokens.colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.2px'
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
                  : tokens.colors.text.secondary,
                flexShrink: 0,
                marginLeft: '10px',
                fontWeight: hasUnread ? '600' : '500'
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
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: isTyping
                ? tokens.colors.brand.primary
                : hasUnread
                ? tokens.colors.text.primary
                : tokens.colors.text.secondary,
              fontWeight: hasUnread ? '500' : '400',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              fontStyle: isTyping ? 'italic' : 'normal',
              lineHeight: '1.4'
            }}
          >
            {isTyping ? '⌨️ מקליד...' : lastMessage || 'אין הודעות'}
          </p>

          {hasUnread && (
            <div
              style={{
                minWidth: '22px',
                height: '22px',
                padding: '0 7px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #0084FF 0%, #0073E6 100%)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.4)',
                animation: hasUnread ? 'pulse-badge 2s ease-in-out infinite' : 'none'
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-badge {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
}
