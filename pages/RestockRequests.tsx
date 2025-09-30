import React from 'react';
import { DataStore } from '../data/types';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { hebrew } from '../src/lib/hebrew';

interface RestockRequestsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function RestockRequests(_: RestockRequestsProps) {
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
      <div style={{ fontSize: '44px' }}>🔄</div>
      <h1 style={{ margin: 0 }}>{hebrew.restock_requests}</h1>
      <p style={{ margin: 0, maxWidth: '320px', color: theme.hint_color }}>
        ניהול בקשות חידוש המלאי יופיע כאן עם אישורים ושיוך למחסן.
      </p>
    </div>
  );
}

export default RestockRequests;
