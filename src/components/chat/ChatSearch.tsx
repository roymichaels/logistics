import React from 'react';
import { tokens } from '../../styles/tokens';

interface ChatSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function ChatSearch({ value, onChange, placeholder }: ChatSearchProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        borderRadius: '12px',
        background: tokens.colors.background.card,
        color: tokens.colors.text.primary,
        fontSize: '16px',
        marginBottom: '20px'
      }}
    />
  );
}
