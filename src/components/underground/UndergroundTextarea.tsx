import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  error?: string;
}

export const UndergroundTextarea: React.FC<UndergroundTextareaProps> = ({
  value = '',
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  maxLength,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: undergroundTheme.spacing.md,
    background: undergroundTheme.colors.background.dark,
    border: `2px solid ${
      error
        ? undergroundTheme.colors.status.error
        : isFocused
        ? undergroundTheme.colors.accent.primary
        : undergroundTheme.colors.glassmorphism.border
    }`,
    borderRadius: undergroundTheme.borderRadius.lg,
    color: undergroundTheme.colors.text.primary,
    fontSize: undergroundTheme.typography.fontSize.base,
    fontFamily: undergroundTheme.typography.fontFamily,
    resize: 'vertical',
    outline: 'none',
    transition: `all ${undergroundTheme.transitions.normal}`,
    boxShadow: isFocused
      ? error
        ? undergroundTheme.shadows.glow.error
        : undergroundTheme.shadows.glow.cyan
      : 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  };

  const errorStyle: React.CSSProperties = {
    marginTop: undergroundTheme.spacing.xs,
    color: undergroundTheme.colors.status.error,
    fontSize: undergroundTheme.typography.fontSize.xs,
  };

  const counterStyle: React.CSSProperties = {
    marginTop: undergroundTheme.spacing.xs,
    textAlign: 'right',
    color: undergroundTheme.colors.text.tertiary,
    fontSize: undergroundTheme.typography.fontSize.xs,
  };

  return (
    <div>
      <textarea
        value={internalValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        style={textareaStyle}
      />
      {error && <div style={errorStyle}>{error}</div>}
      {maxLength && (
        <div style={counterStyle}>
          {internalValue.length}/{maxLength}
        </div>
      )}
    </div>
  );
};
