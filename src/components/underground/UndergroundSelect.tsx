import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getGlassmorphicStyle } from '../../utils/undergroundStyles';

interface UndergroundSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<{ value: string; label: string; icon?: string }>;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  label?: string;
  children?: ReactNode;
}

export function UndergroundSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  fullWidth = false,
  style,
  label,
  children,
}: UndergroundSelectProps) {
  const selectStyle: React.CSSProperties = {
    ...undergroundTheme.components.input,
    width: fullWidth ? '100%' : 'auto',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(undergroundTheme.colors.text.secondary)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    backgroundSize: '16px',
    paddingLeft: '40px',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLSelectElement>) => {
    if (!disabled) {
      e.currentTarget.style.borderColor = undergroundTheme.colors.accent.primary;
      e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyan;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLSelectElement>) => {
    if (!disabled) {
      e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: undergroundTheme.spacing.xs,
            fontSize: undergroundTheme.typography.fontSize.sm,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
            color: undergroundTheme.colors.text.primary,
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={selectStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children ? children : options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon ? `${option.icon} ${option.label}` : option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
