import React, { useState } from 'react';
import type { ConversationWithDetails } from '@/types/messaging';
import { logger } from '@/lib/logger';

interface BusinessChannelsListProps {
  conversations: ConversationWithDetails[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateChannel: () => void;
  userId: string;
}

interface ChannelItemProps {
  conversation: ConversationWithDetails;
  isActive: boolean;
  onClick: () => void;
}

function ChannelItem({ conversation, isActive, onClick }: ChannelItemProps) {
  const hasUnread = (conversation.unread_count || 0) > 0;
  const isMuted = conversation.subscription?.is_muted;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        cursor: 'pointer',
        backgroundColor: isActive ? 'var(--primary-color, #007bff)' : 'transparent',
        color: isActive ? 'white' : hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: hasUnread ? 600 : 400,
        borderRadius: '6px',
        marginBottom: '2px',
        transition: 'all 0.15s ease',
        opacity: isMuted ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--background-hover, rgba(0,0,0,0.05))';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <span style={{ marginRight: '8px', fontSize: '18px' }}>
        {conversation.icon || (conversation.is_private ? '🔒' : '#')}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {conversation.name}
      </span>
      {hasUnread && !isActive && (
        <span
          style={{
            backgroundColor: 'var(--primary-color, #007bff)',
            color: 'white',
            borderRadius: '10px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            marginLeft: '8px',
          }}
        >
          {conversation.unread_count}
        </span>
      )}
      {conversation.is_bookmarked && (
        <span style={{ marginLeft: '8px', fontSize: '14px' }}>⭐</span>
      )}
    </div>
  );
}

interface ChannelSectionProps {
  title: string;
  channels: ConversationWithDetails[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function ChannelSection({
  title,
  channels,
  activeConversationId,
  onSelectConversation,
  isCollapsed = false,
  onToggleCollapse,
}: ChannelSectionProps) {
  if (channels.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        onClick={onToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
        }}
      >
        <span style={{ marginRight: '8px', transition: 'transform 0.15s' }}>
          {isCollapsed ? '▶' : '▼'}
        </span>
        <span>{title}</span>
        <span style={{ marginLeft: '8px', opacity: 0.6 }}>({channels.length})</span>
      </div>
      {!isCollapsed && (
        <div style={{ paddingLeft: '8px' }}>
          {channels.map(channel => (
            <ChannelItem
              key={channel.id}
              conversation={channel}
              isActive={activeConversationId === channel.id}
              onClick={() => onSelectConversation(channel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BusinessChannelsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateChannel,
  userId,
}: BusinessChannelsListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const bookmarked = conversations.filter(c => c.is_bookmarked);
  const general = conversations.filter(c =>
    c.channel_type === 'general' ||
    c.channel_type === 'announcements' ||
    c.channel_type === 'random'
  );
  const departments = conversations.filter(c => c.channel_type === 'department');
  const projects = conversations.filter(c => c.channel_type === 'project');
  const directMessages = conversations.filter(c => c.type === 'direct');
  const groups = conversations.filter(c => c.type === 'group' && !c.channel_type);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--background-secondary, #f8f9fa)',
        borderRight: '1px solid var(--border-color, #e0e0e0)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color, #e0e0e0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Channels</h2>
        <button
          onClick={onCreateChannel}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--background-hover, rgba(0,0,0,0.1))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Create new channel"
        >
          +
        </button>
      </div>

      {/* Channels List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        <ChannelSection
          title="Starred"
          channels={bookmarked}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('starred')}
          onToggleCollapse={() => toggleSection('starred')}
        />

        <ChannelSection
          title="Channels"
          channels={general}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('channels')}
          onToggleCollapse={() => toggleSection('channels')}
        />

        <ChannelSection
          title="Departments"
          channels={departments}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('departments')}
          onToggleCollapse={() => toggleSection('departments')}
        />

        <ChannelSection
          title="Projects"
          channels={projects}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('projects')}
          onToggleCollapse={() => toggleSection('projects')}
        />

        <ChannelSection
          title="Direct Messages"
          channels={directMessages}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('dms')}
          onToggleCollapse={() => toggleSection('dms')}
        />

        <ChannelSection
          title="Groups"
          channels={groups}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          isCollapsed={collapsedSections.has('groups')}
          onToggleCollapse={() => toggleSection('groups')}
        />
      </div>
    </div>
  );
}
