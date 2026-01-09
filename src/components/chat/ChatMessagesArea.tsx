import React, { useRef, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
import { MessageGroup } from './MessageGroup';
import { groupMessagesBySender } from './utils';

interface ChatMessagesAreaProps {
  messages: any[];
  currentUserId: string;
  chatPartner?: {
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  isGroup?: boolean;
}

export function ChatMessagesArea({
  messages,
  currentUserId,
  chatPartner,
  isGroup = false
}: ChatMessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const messageGroups = groupMessagesBySender(messages);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          padding: '40px',
          background: 'transparent'
        }}
      >
        <div style={{ fontSize: '72px', opacity: 0.5 }}>💬</div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: tokens.colors.text,
            textAlign: 'center'
          }}
        >
          אין הודעות עדיין
        </div>
        <div
          style={{
            fontSize: '14px',
            color: tokens.colors.subtle,
            textAlign: 'center',
            maxWidth: '300px',
            lineHeight: '1.5'
          }}
        >
          התחל שיחה על ידי שליחת הודעה
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: tokens.colors.background.primary,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ flex: 1 }}>
        {messageGroups.map((group, index) => {
          const isCurrentUser = group.senderId === currentUserId;
          const senderName = isCurrentUser
            ? 'אני'
            : chatPartner?.name || 'משתמש';
          const senderAvatar = isCurrentUser ? undefined : chatPartner?.avatar;

          return (
            <MessageGroup
              key={`group-${index}`}
              messages={group.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                timestamp: msg.created_at,
                senderId: msg.sender_id,
                status: msg.status
              }))}
              senderName={senderName}
              senderAvatar={senderAvatar}
              isCurrentUser={isCurrentUser}
              showAvatar={!isCurrentUser || isGroup}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
