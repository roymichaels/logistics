import React from 'react';
import { DataStore } from '../data/types';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { hebrew } from '../src/lib/hebrew';

interface PartnersProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Partners(_: PartnersProps) {
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
        textAlign: 'center',
        gap: '16px'
      }}
    >
      <div style={{ fontSize: '44px' }}>🤝</div>
      <h1 style={{ margin: 0 }}>{hebrew.partners}</h1>
      <p style={{ margin: 0, maxWidth: '320px', color: theme.hint_color }}>
        בקרוב: ניהול שותפים, ספקים וערוצי הפצה מרכזיים לעסק.
      </p>
    </div>
  );
}

export default Partners;
