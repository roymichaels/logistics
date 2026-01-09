import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface UndergroundTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function UndergroundTabs({ tabs, activeTab, onChange }: UndergroundTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: isActive
                ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(123, 63, 242, 0.2) 100%)'
                : 'transparent',
              border: isActive ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              borderRadius: '8px',
              color: isActive ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              position: 'relative',
              backdropFilter: isActive ? 'blur(10px)' : 'none',
              boxShadow: isActive
                ? '0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }
            }}
          >
            {tab.icon && <span style={{ fontSize: '18px' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isActive
                    ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  minWidth: '20px',
                  textAlign: 'center',
                  boxShadow: isActive ? '0 0 12px rgba(0, 212, 255, 0.4)' : 'none',
                }}
              >
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
