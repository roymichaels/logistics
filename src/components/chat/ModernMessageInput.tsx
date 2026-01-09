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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        padding: '12px 16px',
        borderTop: `1px solid ${tokens.colors.divider}`,
        background: tokens.colors.background.secondary,
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
              background: tokens.colors.background.tertiary,
              border: `1px solid ${tokens.colors.divider}`,
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
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
          gap: '10px',
          alignItems: 'flex-end'
        }}
      >
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            padding: '10px',
            background: showEmojiPicker ? `${tokens.colors.brand.primary}20` : 'transparent',
            border: 'none',
            borderRadius: '50%',
            color: tokens.colors.text.primary,
            fontSize: '22px',
            cursor: 'pointer',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}25`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = showEmojiPicker ? `${tokens.colors.brand.primary}20` : 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="הוסף אימוג'י"
        >
          😊
        </button>

        <button
          style={{
            padding: '10px',
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            color: tokens.colors.text.primary,
            fontSize: '20px',
            cursor: 'pointer',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${tokens.colors.brand.primary}25`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="צרף קובץ"
        >
          📎
        </button>

        <textarea
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: '24px',
            background: tokens.colors.background.primary,
            color: tokens.colors.text.primary,
            fontSize: '15px',
            outline: 'none',
            transition: 'all 0.2s ease',
            minHeight: '40px',
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            overflowY: 'auto'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = tokens.colors.brand.primary;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${tokens.colors.brand.primary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = tokens.colors.border.default;
            e.currentTarget.style.boxShadow = 'none';
          }}
          onInput={(e: any) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />

        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          style={{
            padding: '0',
            background:
              value.trim() && !disabled
                ? 'linear-gradient(135deg, #0084FF 0%, #0073E6 100%)'
                : tokens.colors.background.secondary,
            color: value.trim() && !disabled ? '#fff' : tokens.colors.text.secondary,
            border: 'none',
            borderRadius: '50%',
            fontSize: '22px',
            fontWeight: '600',
            cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              value.trim() && !disabled
                ? '0 4px 16px rgba(0, 132, 255, 0.4)'
                : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0,
            opacity: value.trim() && !disabled ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (value.trim() && !disabled) {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow =
                '0 6px 20px rgba(0, 132, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            if (value.trim() && !disabled) {
              e.currentTarget.style.boxShadow =
                '0 4px 16px rgba(0, 132, 255, 0.4)';
            }
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
