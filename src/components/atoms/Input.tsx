import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../styles/design-system';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  error = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  disabled,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: fullWidth ? '100%' : 'auto',
  };

  const inputStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: `${spacing.md} ${spacing.lg}`,
    paddingLeft: leftIcon ? spacing['4xl'] : spacing.lg,
    paddingRight: rightIcon ? spacing['4xl'] : spacing.lg,
    background: colors.background.secondary,
    border: `1px solid ${error ? colors.status.error : isFocused ? colors.border.focus : colors.border.primary}`,
    borderRadius: borderRadius['2xl'], // 20px - Twitter standard for inputs
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.primary,
    outline: 'none',
    transition: transitions.normal,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    minHeight: '44px',
    boxShadow: isFocused ? `0 0 0 2px ${colors.border.focus}` : 'none',
    ...style,
  };

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.text.secondary,
    pointerEvents: 'none',
  };

  const leftIconStyles: React.CSSProperties = {
    ...iconStyles,
    left: spacing.lg,
  };

  const rightIconStyles: React.CSSProperties = {
    ...iconStyles,
    right: spacing.lg,
  };

  return (
    <div style={containerStyles}>
      {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}
      <input
        {...props}
        disabled={disabled}
        style={inputStyles}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
      />
      {rightIcon && <span style={rightIconStyles}>{rightIcon}</span>}
    </div>
  );
}

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function TextArea({
  error = false,
  fullWidth = false,
  resize = 'vertical',
  style,
  disabled,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  const textareaStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.background.secondary,
    border: `1px solid ${error ? colors.status.error : isFocused ? colors.border.focus : colors.border.primary}`,
    borderRadius: borderRadius.xl, // 16px for textarea
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.primary,
    outline: 'none',
    transition: transitions.normal,
    resize,
    minHeight: '100px',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: isFocused ? `0 0 0 2px ${colors.border.focus}` : 'none',
    lineHeight: typography.lineHeight.normal,
    ...style,
  };

  return (
    <textarea
      {...props}
      disabled={disabled}
      style={textareaStyles}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}
