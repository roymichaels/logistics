import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?: 'manager' | 'worker';
}

export function BottomNavigation({ currentPage, onNavigate, userRole }: BottomNavigationProps) {
  const { theme, haptic } = useTelegramUI();

  const tabs = userRole === 'manager' 
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'orders', label: 'Inventory', icon: '📦' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'tasks', label: 'Tasks', icon: '✅' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
      ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderTop: `1px solid ${theme.hint_color}20`,
      display: 'flex',
      padding: '8px 0',
      zIndex: 1000
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            haptic();
            onNavigate(tab.id);
          }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: currentPage === tab.id ? theme.button_color : theme.hint_color,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: currentPage === tab.id ? '600' : '400'
          }}
        >
          <span style={{ fontSize: '20px' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}