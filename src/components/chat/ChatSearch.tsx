import React from 'react';
import { ROYAL_COLORS } from '../../styles/royalTheme';

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
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '12px',
        background: ROYAL_COLORS.card,
        color: ROYAL_COLORS.text,
        fontSize: '16px',
        marginBottom: '20px'
      }}
    />
  );
}
