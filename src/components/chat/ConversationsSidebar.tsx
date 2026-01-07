import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { ConversationListItem } from './ConversationListItem';

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

interface ConversationsSidebarProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (id: string) => void;
  title?: string;
  onSearch?: (query: string) => void;
  emptyMessage?: string;
}

export function ConversationsSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  title = '💬 הודעות',
  onSearch,
  emptyMessage = 'אין שיחות פעילות'
}: ConversationsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.name.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${tokens.colors.background.cardBorder}`
        }}
      >
        <h1
          style={{
            margin: '0 0 16px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text
          }}
        >
          {title}
        </h1>

        <input
          type="text"
          placeholder="חפש שיחות..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '12px',
            background: tokens.colors.panel,
            color: tokens.colors.text,
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = tokens.colors.brand.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              tokens.colors.background.cardBorder;
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {filteredConversations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <div
              style={{
                fontSize: '16px',
                color: tokens.colors.text,
                fontWeight: '600',
                marginBottom: '8px'
              }}
            >
              {emptyMessage}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>
              התחל שיחה חדשה עם משתמש
            </div>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              {...conversation}
              onClick={() => onSelectConversation(conversation.id)}
              isSelected={conversation.id === selectedConversationId}
            />
          ))
        )}
      </div>
    </div>
  );
}
