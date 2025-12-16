import React from 'react';
import { appTokens } from '../../theme/app/tokens';

type Tab = { id: string; label: string };

export type TabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  tx?: boolean;
  style?: React.CSSProperties;
};

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, tx = false, style }) => {
  const t = appTokens;

  return (
    <div
      style={{
        display: 'flex',
        gap: t.spacing.sm,
        borderBottom: `1px solid ${t.colors.border}`,
        position: 'relative',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              position: 'relative',
              padding: `${t.spacing.sm} ${t.spacing.md}`,
              background: 'transparent',
              border: 'none',
              color: isActive ? t.colors.text : t.colors.muted,
              fontWeight: isActive ? t.typography.weight.bold : t.typography.weight.medium,
              cursor: 'pointer',
            }}
          >
            {tab.label}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -2,
                  height: 3,
                  borderRadius: 999,
                  background: t.colors.primary,
                  transition: t.motion.fast,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
