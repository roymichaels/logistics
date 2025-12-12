import React from 'react';
import { useTheme } from '../../theme/tokens';
import { telegramXTokens } from '../../theme/telegramx/tokens';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  tx?: boolean;
  label?: string;
};

export const Input: React.FC<InputProps> = ({ tx = false, label, style, children, ...rest }) => {
  const base = useTheme();
  const t = tx ? telegramXTokens : base;

  return (
    <label style={{ display: 'block', width: '100%' }}>
      {label && (
        <div
          style={{
            marginBottom: tx ? t.spacing.xs : base.spacing?.xs ?? 6,
            color: tx ? t.colors.muted : base.colors.text,
            fontSize: tx ? t.typography.size.sm : base.typography.size.sm,
            fontWeight: tx ? t.typography.weight.medium : base.typography.weight.medium,
          }}
        >
          {label}
        </div>
      )}
      <input
        style={{
          width: '100%',
          padding: tx
            ? `${t.spacing.sm} ${t.spacing.md}`
            : `${base.spacing?.sm ?? '10px'} ${base.spacing?.md ?? '14px'}`,
          background: tx ? t.colors.backgroundAlt : base.colors.panel,
          color: tx ? t.colors.text : base.colors.text,
          borderRadius: tx ? t.radius.md : base.radius.md,
          border: `1px solid ${tx ? t.colors.border : base.colors.border}`,
          boxShadow: tx ? t.shadows.sm : undefined,
          outline: 'none',
          transition: tx ? t.motion.base : base.transitions.base,
          ...style,
        }}
        {...rest}
      />
      {/* children are intentionally ignored for the native input */}
    </label>
  );
};
