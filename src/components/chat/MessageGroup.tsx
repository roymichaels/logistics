import React, { useState } from 'react';
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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];
  const senderInitial = senderName[0]?.toUpperCase() || 'U';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: '16px',
        paddingLeft: isCurrentUser ? '56px' : '0',
        paddingRight: isCurrentUser ? '0' : '56px'
      }}
    >
      {!isCurrentUser && showAvatar && (
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: senderAvatar
              ? `url(${senderAvatar}) center/cover`
              : 'linear-gradient(135deg, #1D9BF0, #7B3FF2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: '#fff',
            flexShrink: 0,
            alignSelf: 'flex-end',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {!senderAvatar && senderInitial}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          maxWidth: '70%',
          minWidth: '120px'
        }}
      >
        {!isCurrentUser && showAvatar && (
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: tokens.colors.brand.primary,
              marginBottom: '6px',
              paddingRight: '12px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            {senderName}
          </div>
        )}

        {messages.map((message, index) => {
          const isFirst = index === 0;
          const isLast = index === messages.length - 1;
          const isHovered = hoveredMessageId === message.id;

          return (
            <div
              key={message.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div
                style={{
                  padding: '12px 16px',
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, #0084FF 0%, #0073E6 100%)'
                    : tokens.colors.background.card,
                  color: isCurrentUser ? '#fff' : tokens.colors.text.primary,
                  borderRadius: '20px',
                  borderTopRightRadius:
                    isCurrentUser && isFirst ? '20px' : isCurrentUser ? '6px' : '20px',
                  borderTopLeftRadius:
                    !isCurrentUser && isFirst ? '20px' : !isCurrentUser ? '6px' : '20px',
                  borderBottomRightRadius: isCurrentUser && isLast ? '6px' : '20px',
                  borderBottomLeftRadius: !isCurrentUser && isLast ? '6px' : '20px',
                  border: isCurrentUser
                    ? 'none'
                    : `1px solid ${tokens.colors.border.default}`,
                  boxShadow: isCurrentUser
                    ? '0 2px 12px rgba(0, 132, 255, 0.35)'
                    : '0 2px 8px rgba(0, 0, 0, 0.25)',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                  cursor: 'default'
                }}
              >
                {/* Message tail/pointer */}
                {isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      [isCurrentUser ? 'right' : 'left']: '-6px',
                      width: '0',
                      height: '0',
                      borderStyle: 'solid',
                      borderWidth: isCurrentUser
                        ? '0 0 12px 12px'
                        : '0 12px 12px 0',
                      borderColor: isCurrentUser
                        ? 'transparent transparent transparent #0084FF'
                        : `transparent ${tokens.colors.background.card} transparent transparent`,
                      filter: isCurrentUser
                        ? 'drop-shadow(0 1px 2px rgba(0, 132, 255, 0.3))'
                        : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                    }}
                  />
                )}

                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.5',
                    letterSpacing: '0.2px'
                  }}
                >
                  {message.content}
                </div>

                {/* Time and status inline for last message */}
                {isLast && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: isCurrentUser ? 'rgba(255, 255, 255, 0.75)' : tokens.colors.text.secondary,
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'flex-end'
                    }}
                  >
                    <span>{formatTime(message.timestamp)}</span>
                    {isCurrentUser && message.status && (
                      <span
                        style={{
                          fontSize: '16px',
                          lineHeight: 1,
                          color:
                            message.status === 'read'
                              ? '#4FC3F7'
                              : message.status === 'delivered'
                              ? 'rgba(255, 255, 255, 0.85)'
                              : 'rgba(255, 255, 255, 0.5)'
                        }}
                      >
                        {message.status === 'read'
                          ? '✓✓'
                          : message.status === 'delivered'
                          ? '✓✓'
                          : message.status === 'sent'
                          ? '✓'
                          : '◷'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick reaction bar on hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-32px',
                    [isCurrentUser ? 'right' : 'left']: '0',
                    background: tokens.colors.background.card,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: '24px',
                    padding: '4px 8px',
                    display: 'flex',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    zIndex: 10
                  }}
                >
                  {['❤️', '👍', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <button
                      key={emoji}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
