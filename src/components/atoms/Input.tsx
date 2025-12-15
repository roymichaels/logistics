import React from 'react';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../../design-system';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  error = false,
  errorMessage,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  disabled,
  className,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    width: fullWidth ? '100%' : 'auto',
  };

  const inputWrapperStyles: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    paddingLeft: leftIcon ? spacing[10] : spacing[4],
    paddingRight: rightIcon ? spacing[10] : spacing[4],
    background: colors.background.secondary,
    border: `1px solid ${error ? colors.status.error : isFocused ? colors.border.focus : colors.border.primary}`,
    borderRadius: borderRadius['2xl'],
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.normal,
    outline: 'none',
    transition: `all ${transitions.normal}`,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    minHeight: '44px',
    boxShadow: isFocused ? (error ? `0 0 0 2px ${colors.status.errorFaded}` : shadows.focus) : 'none',
    ...style,
  };

  const iconStyles: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: error ? colors.status.error : colors.text.secondary,
    pointerEvents: 'none',
    fontSize: '20px',
  };

  const leftIconStyles: React.CSSProperties = {
    ...iconStyles,
    left: spacing[4],
  };

  const rightIconStyles: React.CSSProperties = {
    ...iconStyles,
    right: spacing[4],
  };

  const errorMessageStyles: React.CSSProperties = {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.status.error,
    paddingLeft: spacing[1],
  };

  return (
    <div style={containerStyles}>
      <div style={inputWrapperStyles}>
        {leftIcon && <span style={leftIconStyles}>{leftIcon}</span>}
        <input
          {...props}
          className={className}
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
      {error && errorMessage && <div style={errorMessageStyles}>{errorMessage}</div>}
    </div>
  );
}

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function TextArea({
  error = false,
  errorMessage,
  fullWidth = false,
  resize = 'vertical',
  style,
  disabled,
  className,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
    width: fullWidth ? '100%' : 'auto',
  };

  const textareaStyles: React.CSSProperties = {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    background: colors.background.secondary,
    border: `1px solid ${error ? colors.status.error : isFocused ? colors.border.focus : colors.border.primary}`,
    borderRadius: borderRadius.xl,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.relaxed,
    outline: 'none',
    transition: `all ${transitions.normal}`,
    resize,
    minHeight: '100px',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: isFocused ? (error ? `0 0 0 2px ${colors.status.errorFaded}` : shadows.focus) : 'none',
    ...style,
  };

  const errorMessageStyles: React.CSSProperties = {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.status.error,
    paddingLeft: spacing[1],
  };

  return (
    <div style={containerStyles}>
      <textarea
        {...props}
        className={className}
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
      {error && errorMessage && <div style={errorMessageStyles}>{errorMessage}</div>}
    </div>
  );
}

export interface SearchInputProps extends InputProps {
  onClear?: () => void;
}

export function SearchInput({ onClear, value, ...props }: SearchInputProps) {
  const searchIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const clearButton = value && onClear ? (
    <button
      type="button"
      onClick={onClear}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        color: colors.text.secondary,
        transition: `color ${transitions.fast}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = colors.text.primary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.secondary)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 6L6 18M6 6L18 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  ) : undefined;

  return <Input {...props} value={value} leftIcon={searchIcon} rightIcon={clearButton} />;
}
