import React, { useEffect, useState } from 'react';
import type { TypingIndicator as TypingIndicatorType } from '@/types/messaging';

interface TypingIndicatorProps {
  typingUsers: Array<{ user_id: string; name: string }>;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div
      style={{
        padding: '8px 16px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <TypingDots />
      <span>{getTypingText()}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}
    >
      <Dot delay={0} />
      <Dot delay={0.2} />
      <Dot delay={0.4} />
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <div
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--text-secondary)',
        animation: `typing-dot 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <style>
        {`
          @keyframes typing-dot {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
