import React, { useState } from 'react';

interface UndergroundSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function UndergroundSearchBar({
  value,
  onChange,
  placeholder = 'חפש...',
  onClear,
}: UndergroundSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '18px',
          color: isFocused ? '#00d4ff' : 'rgba(255, 255, 255, 0.4)',
          transition: 'color 0.3s ease',
          pointerEvents: 'none',
        }}
      >
        🔍
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '14px 48px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: isFocused
            ? '1px solid rgba(0, 212, 255, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: '400',
          outline: 'none',
          backdropFilter: 'blur(10px)',
          boxShadow: isFocused
            ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 3px rgba(0, 0, 0, 0.2)'
            : 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#00d4ff';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
