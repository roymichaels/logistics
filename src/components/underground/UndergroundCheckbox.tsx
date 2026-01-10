import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const UndergroundCheckbox: React.FC<UndergroundCheckboxProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
}) => {
  const [isChecked, setIsChecked] = useState(checked);
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = () => {
    if (disabled) return;
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    onChange?.(newChecked);
  };

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: undergroundTheme.spacing.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const checkboxStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: undergroundTheme.borderRadius.sm,
    border: `2px solid ${
      isChecked ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border
    }`,
    background: isChecked
      ? undergroundTheme.colors.accent.primary
      : undergroundTheme.colors.background.dark,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${undergroundTheme.transitions.fast}`,
    boxShadow: isChecked ? undergroundTheme.shadows.glow.cyan : 'none',
    transform: isHovered && !disabled ? 'scale(1.05)' : 'scale(1)',
  };

  const checkmarkStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    color: undergroundTheme.colors.text.primary,
    opacity: isChecked ? 1 : 0,
    transition: `opacity ${undergroundTheme.transitions.fast}`,
  };

  const labelStyle: React.CSSProperties = {
    color: undergroundTheme.colors.text.primary,
    fontSize: undergroundTheme.typography.fontSize.sm,
    userSelect: 'none',
  };

  return (
    <div
      style={containerStyle}
      onClick={handleChange}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={checkboxStyle}>
        <svg style={checkmarkStyle} viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l2.5 2.5L10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {label && <span style={labelStyle}>{label}</span>}
    </div>
  );
};
