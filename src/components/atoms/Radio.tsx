import React from 'react';
import { colors, spacing } from '../../design-system';

export interface RadioProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  value?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Radio({
  checked,
  onChange,
  disabled = false,
  label,
  name,
  value,
  size = 'md',
}: RadioProps) {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const boxSize = sizes[size];
  const dotSize = boxSize - 8;

  const handleClick = () => {
    if (!disabled && !checked) {
      onChange(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !disabled && !checked) {
      e.preventDefault();
      onChange(true);
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
        role="radio"
        aria-checked={checked}
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
          borderRadius: '50%',
          border: `2px solid ${checked ? colors.brand.primary : colors.border.primary}`,
          backgroundColor: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease-in-out',
        }}
      >
        {checked && (
          <div
            style={{
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              borderRadius: '50%',
              backgroundColor: colors.brand.primary,
              transition: 'all 150ms ease-in-out',
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
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  name: string;
  disabled?: boolean;
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export function RadioGroup({
  value,
  onChange,
  options,
  name,
  disabled = false,
  direction = 'vertical',
  size = 'md',
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: spacing[3],
        flexWrap: direction === 'horizontal' ? 'wrap' : 'nowrap',
      }}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          disabled={disabled || option.disabled}
          size={size}
        />
      ))}
    </div>
  );
}
