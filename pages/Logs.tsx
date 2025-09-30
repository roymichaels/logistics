import React from 'react';
import { DataStore } from '../data/types';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { hebrew } from '../src/lib/hebrew';

interface LogsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Logs(_: LogsProps) {
  const { theme } = useTelegramUI();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '48px 24px',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '44px' }}>📝</div>
      <h1 style={{ margin: 0 }}>{hebrew.logs}</h1>
      <p style={{ margin: 0, maxWidth: '320px', color: theme.hint_color }}>
        יומן פעילות המחסן ייטען כאן עם אירועים, חתימות ואישורים.
      </p>
    </div>
  );
}

export default Logs;
