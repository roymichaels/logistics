import React, { useState, useRef } from 'react';
import { tokens } from '../../styles/tokens';

interface ModernMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  onTyping?: () => void;
}

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '❤️', '💙',
  '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💯'
];

export function ModernMessageInput({
  value,
  onChange,
  onSend,
  placeholder = 'כתוב הודעה...',
  disabled = false,
  onTyping
}: ModernMessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);

    if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
      }, 3000);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        borderTop: `1px solid ${tokens.colors.background.cardBorder}`,
        background: tokens.colors.background.card,
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}
    >
      {showEmojiPicker && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setShowEmojiPicker(false)}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: '16px',
              marginBottom: '8px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              maxWidth: '320px',
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '8px'
            }}
          >
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                style={{
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '20px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${tokens.colors.brand.primary}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end'
        }}
      >
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            padding: '10px',
            background: 'transparent',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '50%',
            color: tokens.colors.text,
            fontSize: '20px',
            cursor: 'pointer',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}15`;
            e.currentTarget.style.borderColor = tokens.colors.brand.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
          }}
          title="הוסף אימוג'י"
        >
          😊
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            borderRadius: '24px',
            background: tokens.colors.panel,
            color: tokens.colors.text,
            fontSize: '15px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            minHeight: '42px',
            maxHeight: '120px',
            resize: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = tokens.colors.brand.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
          }}
        />

        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          style={{
            padding: '0',
            background:
              value.trim() && !disabled
                ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                : tokens.colors.background.cardBorder,
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            fontSize: '20px',
            cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              value.trim() && !disabled
                ? '0 4px 12px rgba(29, 155, 240, 0.4)'
                : 'none',
            transition: 'all 0.3s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (value.trim() && !disabled) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow =
                '0 6px 16px rgba(29, 155, 240, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            if (value.trim() && !disabled) {
              e.currentTarget.style.boxShadow =
                '0 4px 12px rgba(29, 155, 240, 0.4)';
            }
          }}
        >
          ↵
        </button>
      </div>
    </div>
  );
}
