import React from 'react';
import { Input, InputProps, TextArea, TextAreaProps, Label } from '../atoms';
import { colors, spacing, typography } from '../../styles/design-system';

export interface FormFieldProps extends Omit<InputProps, 'error'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  isTextArea?: boolean;
  textAreaProps?: TextAreaProps;
}

export function FormField({
  label,
  error,
  hint,
  required,
  isTextArea = false,
  textAreaProps,
  ...inputProps
}: FormFieldProps) {
  const fieldId = inputProps.id || `field-${Math.random().toString(36).substr(2, 9)}`;

  const containerStyles: React.CSSProperties = {
    marginBottom: spacing.lg,
  };

  const hintStyles: React.CSSProperties = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  };

  const errorStyles: React.CSSProperties = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.status.error,
    marginTop: spacing.xs,
  };

  return (
    <div style={containerStyles}>
      {label && (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      )}
      {hint && <span style={hintStyles}>{hint}</span>}
      {isTextArea ? (
        <TextArea {...textAreaProps} id={fieldId} error={!!error} fullWidth />
      ) : (
        <Input {...inputProps} id={fieldId} error={!!error} fullWidth />
      )}
      {error && <span style={errorStyles}>{error}</span>}
    </div>
  );
}
