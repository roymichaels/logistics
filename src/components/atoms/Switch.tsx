import React from 'react';
import { colors, spacing } from '../../design-system';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Switch({ checked, onChange, disabled = false, label, size = 'md' }: SwitchProps) {
  const sizes = {
    sm: { width: 36, height: 20, dot: 16 },
    md: { width: 44, height: 24, dot: 20 },
    lg: { width: 52, height: 28, dot: 24 },
  };

  const { width, height, dot } = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${height}px`,
          backgroundColor: checked ? colors.brand.primary : colors.background.tertiary,
          transition: 'background-color 200ms ease-in-out',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: checked ? `calc(100% - ${dot + 2}px)` : '2px',
            width: `${dot}px`,
            height: `${dot}px`,
            borderRadius: '50%',
            backgroundColor: colors.background.primary,
            transform: 'translateY(-50%)',
            transition: 'left 200ms ease-in-out',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        />
      </div>
      {label && (
        <label
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text.primary,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onClick={handleClick}
        >
          {label}
        </label>
      )}
    </div>
  );
}
