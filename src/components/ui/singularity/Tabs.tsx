import React, { useState } from 'react';

export type SGTab = { id: string; label: string };

type TabsProps = {
  tabs: SGTab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  density?: 'comfortable' | 'compact';
};

export const SGTabs: React.FC<TabsProps> = ({ tabs, defaultTab, onChange, density = 'comfortable' }) => {
  const [active, setActive] = useState<string>(defaultTab || tabs[0]?.id);
  const pad = density === 'compact' ? '8px 10px' : '10px 14px';

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        overflowX: 'auto',
        padding: '4px 0',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActive(tab.id);
              onChange?.(tab.id);
            }}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: 999,
              padding: pad,
              background: isActive ? 'rgba(29,155,240,0.18)' : 'rgba(255,255,255,0.06)',
              color: '#e8ecf5',
              fontWeight: 700,
              transition: '180ms ease',
              boxShadow: isActive ? '0 6px 18px rgba(29,155,240,0.28)' : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default SGTabs;
