import React from 'react';
import { appTokens } from '../../theme/app/tokens';

export type StepperProps = {
  total: number;
  current: number;
  tx?: boolean;
  style?: React.CSSProperties;
};

export const Stepper: React.FC<StepperProps> = ({ total, current, style }) => {
  const t = appTokens;

  return (
    <div
      style={{
        display: 'flex',
        gap: t.spacing.sm,
        alignItems: 'center',
        ...style,
      }}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const active = idx + 1 === current;
        return (
          <span
            key={idx}
            style={{
              width: active ? 14 : 10,
              height: active ? 14 : 10,
              borderRadius: 999,
              background: active ? t.colors.primary : t.colors.border,
              transition: t.motion.base,
              boxShadow: active ? t.shadows.sm : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
