import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundRadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}

export const UndergroundRadio: React.FC<UndergroundRadioProps> = ({
  checked = false,
  onChange,
  label,
  name,
  value,
  disabled = false,
}) => {
  const [isChecked, setIsChecked] = useState(checked);
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = () => {
    if (disabled) return;
    const newChecked = true;
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

  const radioStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: undergroundTheme.borderRadius.full,
    border: `2px solid ${
      isChecked ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.glassmorphism.border
    }`,
    background: undergroundTheme.colors.background.dark,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${undergroundTheme.transitions.fast}`,
    boxShadow: isChecked ? undergroundTheme.shadows.glow.cyan : 'none',
    transform: isHovered && !disabled ? 'scale(1.05)' : 'scale(1)',
  };

  const dotStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: undergroundTheme.borderRadius.full,
    background: undergroundTheme.colors.accent.primary,
    opacity: isChecked ? 1 : 0,
    transform: isChecked ? 'scale(1)' : 'scale(0)',
    transition: `all ${undergroundTheme.transitions.fast}`,
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
      <div style={radioStyle}>
        <div style={dotStyle} />
      </div>
      {label && <span style={labelStyle}>{label}</span>}
      <input
        type="radio"
        name={name}
        value={value}
        checked={isChecked}
        onChange={() => {}}
        style={{ display: 'none' }}
      />
    </div>
  );
};
