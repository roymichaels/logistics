import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';

interface ChatSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function ChatSearch({ value, onChange, placeholder }: ChatSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: tokens.colors.text.secondary,
          fontSize: '18px',
          pointerEvents: 'none'
        }}
      >
        🔍
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          width: '100%',
          padding: '12px 48px 12px 16px',
          border: `1px solid ${isFocused ? tokens.colors.brand.primary : tokens.colors.border.default}`,
          borderRadius: '24px',
          background: tokens.colors.background.secondary,
          color: tokens.colors.text.primary,
          fontSize: '15px',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: isFocused ? `0 0 0 3px ${tokens.colors.brand.primary}20` : 'none'
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.secondary,
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
