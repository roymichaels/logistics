import React from 'react';
import { Input } from '../../atoms/Input';
import { Typography } from '../../atoms/Typography';
import { TELEGRAM_THEME } from '../../../styles/telegramTheme';

export interface InputGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'url';
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function InputGroup({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  helperText,
  required = false,
  disabled = false,
  maxLength,
  leftIcon,
  rightIcon,
}: InputGroupProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: TELEGRAM_THEME.spacing.xs,
        width: '100%',
      }}
    >
      <label
        htmlFor={name}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: TELEGRAM_THEME.spacing.xs,
        }}
      >
        <Typography
          variant="body2"
          weight="medium"
          color={error ? 'error' : 'primary'}
        >
          {label}
        </Typography>
        {required && (
          <Typography variant="body2" color="error">
            *
          </Typography>
        )}
      </label>

      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        error={!!error}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
      />

      {(error || helperText) && (
        <Typography
          variant="caption"
          color={error ? 'error' : 'secondary'}
        >
          {error || helperText}
        </Typography>
      )}
    </div>
  );
}
