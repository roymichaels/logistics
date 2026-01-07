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
          background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)'
        }}
      >
        <div style={{ fontSize: '64px' }}>💬</div>
        <div
          style={{
            fontSize: '18px',
            color: tokens.colors.subtle,
            textAlign: 'center'
          }}
        >
          אין הודעות עדיין
        </div>
        <div
          style={{
            fontSize: '14px',
            color: tokens.colors.subtle,
            textAlign: 'center'
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
        padding: '20px',
        background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
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
