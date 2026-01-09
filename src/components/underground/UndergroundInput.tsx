import React, { forwardRef } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const UndergroundInput = forwardRef<HTMLInputElement, UndergroundInputProps>(
  ({ label, error, icon, fullWidth = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const inputStyle: React.CSSProperties = {
      ...undergroundTheme.components.input,
      width: fullWidth ? '100%' : 'auto',
      paddingLeft: icon ? undergroundTheme.spacing['5xl'] : undergroundTheme.spacing.lg,
      borderColor: error
        ? undergroundTheme.colors.status.error
        : isFocused
        ? undergroundTheme.colors.accent.primary
        : undergroundTheme.colors.glassmorphism.border,
      boxShadow: isFocused
        ? error
          ? undergroundTheme.shadows.glow.error
          : undergroundTheme.shadows.glow.cyan
        : 'none',
    };

    return (
      <div style={{ marginBottom: undergroundTheme.spacing.lg, width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: undergroundTheme.spacing.sm,
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary,
              fontWeight: undergroundTheme.typography.fontWeight.medium,
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: 'relative' }}>
          {icon && (
            <div
              style={{
                position: 'absolute',
                left: undergroundTheme.spacing.lg,
                top: '50%',
                transform: 'translateY(-50%)',
                color: isFocused ? undergroundTheme.colors.accent.primary : undergroundTheme.colors.text.tertiary,
                display: 'flex',
                alignItems: 'center',
                transition: undergroundTheme.transitions.normal,
              }}
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            style={inputStyle}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
        </div>

        {error && (
          <div
            style={{
              marginTop: undergroundTheme.spacing.xs,
              fontSize: undergroundTheme.typography.fontSize.xs,
              color: undergroundTheme.colors.status.error,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

UndergroundInput.displayName = 'UndergroundInput';
