import React, { useState, useRef, useEffect } from 'react';
import type { SendMessageInput, MentionInput } from '@/types/messaging';
import { logger } from '@/lib/logger';

interface EnhancedMessageComposerProps {
  conversationId: string;
  onSendMessage: (input: SendMessageInput) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  parentMessageId?: string;
  disabled?: boolean;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '⚡'];

export function EnhancedMessageComposer({
  conversationId,
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  parentMessageId,
  disabled = false,
}: EnhancedMessageComposerProps) {
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<MentionInput[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }

    const mentionMatches = newValue.match(/@(\w+)/g);
    if (mentionMatches) {
      logger.debug('[MessageComposer] Detected mentions', { mentions: mentionMatches });
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);

    try {
      await onSendMessage({
        conversation_id: conversationId,
        content: message.trim(),
        message_type: 'text',
        parent_message_id: parentMessageId,
        mentions: mentions.length > 0 ? mentions : undefined,
      });

      setMessage('');
      setMentions([]);

      if (onTyping) {
        onTyping(false);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      logger.error('[MessageComposer] Failed to send message', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);

    setMessage(newMessage);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    const newMessage =
      message.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      message.substring(end);

    setMessage(newMessage);

    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + selectedText.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color, #e0e0e0)',
        backgroundColor: 'var(--background-primary, white)',
      }}
    >
      {parentMessageId && (
        <div
          style={{
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--background-secondary, #f8f9fa)',
            borderLeft: '3px solid var(--primary-color, #007bff)',
            borderRadius: '4px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          Replying in thread
        </div>
      )}

      {/* Formatting Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '8px',
          flexWrap: 'wrap',
        }}
      >
        <ToolbarButton
          onClick={() => insertFormatting('**')}
          title="Bold (Ctrl+B)"
          icon="B"
          style={{ fontWeight: 'bold' }}
        />
        <ToolbarButton
          onClick={() => insertFormatting('_')}
          title="Italic (Ctrl+I)"
          icon="I"
          style={{ fontStyle: 'italic' }}
        />
        <ToolbarButton
          onClick={() => insertFormatting('`')}
          title="Code"
          icon="<>"
          style={{ fontFamily: 'monospace' }}
        />
        <ToolbarButton
          onClick={() => insertFormatting('~~')}
          title="Strikethrough"
          icon="S"
          style={{ textDecoration: 'line-through' }}
        />

        <div style={{ width: '1px', backgroundColor: 'var(--border-color, #e0e0e0)', margin: '0 4px' }} />

        <ToolbarButton
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add emoji"
          icon="😊"
        />
        <ToolbarButton
          onClick={() => {}}
          title="Attach file"
          icon="📎"
          disabled={true}
        />
        <ToolbarButton
          onClick={() => insertFormatting('@')}
          title="Mention someone"
          icon="@"
        />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'var(--background-secondary, #f8f9fa)',
            borderRadius: '8px',
            marginBottom: '8px',
            flexWrap: 'wrap',
          }}
        >
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-hover, rgba(0,0,0,0.1))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '12px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || sending}
          style={{
            flex: 1,
            minHeight: '44px',
            maxHeight: '200px',
            padding: '12px',
            border: '1px solid var(--border-color, #e0e0e0)',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color, #007bff)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color, #e0e0e0)';
          }}
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled}
          style={{
            padding: '12px 24px',
            backgroundColor: message.trim() && !sending && !disabled
              ? 'var(--primary-color, #007bff)'
              : 'var(--background-disabled, #cccccc)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: message.trim() && !sending && !disabled ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            minWidth: '80px',
          }}
          onMouseEnter={(e) => {
            if (message.trim() && !sending && !disabled) {
              e.currentTarget.style.backgroundColor = 'var(--primary-color-dark, #0056b3)';
            }
          }}
          onMouseLeave={(e) => {
            if (message.trim() && !sending && !disabled) {
              e.currentTarget.style.backgroundColor = 'var(--primary-color, #007bff)';
            }
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Helper text */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-tertiary, #999)',
        }}
      >
        <strong>Shift + Enter</strong> for new line, <strong>Enter</strong> to send
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  icon: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

function ToolbarButton({ onClick, title, icon, style, disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        backgroundColor: 'transparent',
        border: '1px solid var(--border-color, #e0e0e0)',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--background-hover, rgba(0,0,0,0.05))';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
