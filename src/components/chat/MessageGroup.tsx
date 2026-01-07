import React from 'react';
import { tokens } from '../../styles/tokens';
import { formatTime } from './utils';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  senderId: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessageGroupProps {
  messages: Message[];
  senderName: string;
  senderAvatar?: string;
  isCurrentUser: boolean;
  showAvatar?: boolean;
}

export function MessageGroup({
  messages,
  senderName,
  senderAvatar,
  isCurrentUser,
  showAvatar = true
}: MessageGroupProps) {
  if (messages.length === 0) return null;

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];
  const senderInitial = senderName[0]?.toUpperCase() || 'U';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: '12px',
        paddingLeft: isCurrentUser ? '48px' : '0',
        paddingRight: isCurrentUser ? '0' : '48px'
      }}
    >
      {!isCurrentUser && showAvatar && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: senderAvatar
              ? `url(${senderAvatar}) center/cover`
              : 'linear-gradient(135deg, rgba(29, 155, 240, 0.8), rgba(123, 63, 242, 0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '700',
            color: '#fff',
            flexShrink: 0,
            alignSelf: 'flex-end'
          }}
        >
          {!senderAvatar && senderInitial}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          maxWidth: '65%'
        }}
      >
        {!isCurrentUser && showAvatar && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: tokens.colors.brand.primary,
              marginBottom: '4px',
              paddingRight: '12px'
            }}
          >
            {senderName}
          </div>
        )}

        {messages.map((message, index) => {
          const isFirst = index === 0;
          const isLast = index === messages.length - 1;

          return (
            <div
              key={message.id}
              style={{
                padding: '10px 14px',
                background: isCurrentUser
                  ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                  : tokens.colors.background.card,
                color: isCurrentUser ? '#fff' : tokens.colors.text,
                borderRadius: '18px',
                borderTopRightRadius:
                  isCurrentUser && isFirst ? '18px' : isCurrentUser ? '4px' : '18px',
                borderTopLeftRadius:
                  !isCurrentUser && isFirst ? '18px' : !isCurrentUser ? '4px' : '18px',
                borderBottomRightRadius: isCurrentUser && isLast ? '4px' : '18px',
                borderBottomLeftRadius: !isCurrentUser && isLast ? '4px' : '18px',
                border: isCurrentUser
                  ? 'none'
                  : `1px solid ${tokens.colors.background.cardBorder}`,
                boxShadow: isCurrentUser
                  ? '0 2px 8px rgba(29, 155, 240, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.2)',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  lineHeight: '1.4'
                }}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontSize: '11px',
            color: tokens.colors.subtle,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            paddingLeft: isCurrentUser ? '0' : '12px',
            paddingRight: isCurrentUser ? '12px' : '0',
            justifyContent: isCurrentUser ? 'flex-end' : 'flex-start'
          }}
        >
          <span>{formatTime(lastMessage.timestamp)}</span>
          {isCurrentUser && lastMessage.status && (
            <span
              style={{
                fontSize: '14px',
                color:
                  lastMessage.status === 'read'
                    ? '#34c759'
                    : lastMessage.status === 'delivered'
                    ? tokens.colors.brand.primary
                    : tokens.colors.subtle
              }}
            >
              {lastMessage.status === 'read'
                ? '✓✓'
                : lastMessage.status === 'delivered'
                ? '✓✓'
                : lastMessage.status === 'sent'
                ? '✓'
                : '○'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
