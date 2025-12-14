import React from 'react';
import type { DevTab } from './DevConsoleDrawer';

interface DevConsoleSidebarProps {
  activeTab: DevTab;
  onTabChange: (tab: DevTab) => void;
  onClose: () => void;
}

interface TabConfig {
  id: DevTab;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'flags', label: 'Flags', icon: '🚩' },
  { id: 'routes', label: 'Routes', icon: '🗺️' },
  { id: 'roles', label: 'Roles', icon: '👤' },
  { id: 'shells', label: 'Shells', icon: '🐚' },
  { id: 'wireframes', label: 'Wire', icon: '📐' },
  { id: 'pages', label: 'Pages', icon: '📄' },
  { id: 'mocks', label: 'Mocks', icon: '🎭' },
  { id: 'diagnostics', label: 'Diag', icon: '🧪' },
  { id: 'themes', label: 'Theme', icon: '🎨' },
];

export function DevConsoleSidebar({ activeTab, onTabChange, onClose }: DevConsoleSidebarProps) {
  return (
    <div
      style={{
        width: '72px',
        backgroundColor: 'rgba(10, 10, 12, 0.6)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '0 12px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '0 12px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 4px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor:
                activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              }
            }}
          >
            {activeTab === tab.id && (
              <div
                style={{
                  position: 'absolute',
                  left: '-12px',
                  width: '3px',
                  height: '50%',
                  backgroundColor: '#60a5fa',
                  borderRadius: '0 2px 2px 0',
                }}
              />
            )}
            <span style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
