import React, { useState } from 'react';
import type { MessageReaction } from '@/types/messaging';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: string;
  onAddReaction: (reaction: string) => void;
  onRemoveReaction: (reaction: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '✅'];

export function MessageReactions({
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reaction]) {
      acc[reaction.reaction] = {
        count: 0,
        userIds: [],
        hasCurrentUser: false,
      };
    }
    acc[reaction.reaction].count++;
    acc[reaction.reaction].userIds.push(reaction.user_id);
    if (reaction.user_id === currentUserId) {
      acc[reaction.reaction].hasCurrentUser = true;
    }
    return acc;
  }, {} as Record<string, { count: number; userIds: string[]; hasCurrentUser: boolean }>);

  const handleReactionClick = (reaction: string) => {
    const group = groupedReactions[reaction];
    if (group && group.hasCurrentUser) {
      onRemoveReaction(reaction);
    } else {
      onAddReaction(reaction);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '6px',
        position: 'relative',
      }}
    >
      {Object.entries(groupedReactions).map(([reaction, data]) => (
        <button
          key={reaction}
          onClick={() => handleReactionClick(reaction)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: data.hasCurrentUser
              ? 'var(--primary-color-light, rgba(0, 123, 255, 0.1))'
              : 'var(--background-secondary, #f8f9fa)',
            border: data.hasCurrentUser
              ? '1px solid var(--primary-color, #007bff)'
              : '1px solid var(--border-color, #e0e0e0)',
            borderRadius: '12px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={`${data.count} reaction${data.count > 1 ? 's' : ''}`}
        >
          <span>{reaction}</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: data.hasCurrentUser ? 'var(--primary-color, #007bff)' : 'var(--text-secondary)',
            }}
          >
            {data.count}
          </span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '28px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--border-color, #e0e0e0)',
            borderRadius: '12px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            opacity: 0.6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.borderColor = 'var(--primary-color, #007bff)';
          }}
          onMouseLeave={(e) => {
            if (!showPicker) {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.borderColor = 'var(--border-color, #e0e0e0)';
            }
          }}
          title="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999,
              }}
              onClick={() => setShowPicker(false)}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '8px',
                display: 'flex',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'white',
                border: '1px solid var(--border-color, #e0e0e0)',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
              }}
            >
              {QUICK_REACTIONS.map(reaction => (
                <button
                  key={reaction}
                  onClick={() => {
                    onAddReaction(reaction);
                    setShowPicker(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background-hover, rgba(0,0,0,0.05))';
                    e.currentTarget.style.transform = 'scale(1.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {reaction}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
