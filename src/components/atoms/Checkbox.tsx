import React from 'react';
import { colors, spacing } from '../../design-system';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Checkbox({
  checked,
  onChange,
  disabled = false,
  label,
  indeterminate = false,
  size = 'md',
}: CheckboxProps) {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const boxSize = sizes[size];

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
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          borderRadius: '4px',
          border: `2px solid ${checked || indeterminate ? colors.brand.primary : colors.border.primary}`,
          backgroundColor: checked || indeterminate ? colors.brand.primary : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease-in-out',
        }}
      >
        {checked && !indeterminate && (
          <svg
            width={boxSize - 4}
            height={boxSize - 4}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.5 4L6 11.5L2.5 8"
              stroke={colors.background.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {indeterminate && (
          <div
            style={{
              width: `${boxSize - 8}px`,
              height: '2px',
              backgroundColor: colors.background.primary,
              borderRadius: '1px',
            }}
          />
        )}
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
