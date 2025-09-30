import React from 'react';
import { DataStore } from '../data/types';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { hebrew } from '../src/lib/hebrew';

interface IncomingProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Incoming(_: IncomingProps) {
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
      <div style={{ fontSize: '44px' }}>🚚</div>
      <h1 style={{ margin: 0 }}>{hebrew.incoming}</h1>
      <p style={{ margin: 0, maxWidth: '320px', color: theme.hint_color }}>
        בקרוב: לוח מעקב אחר כניסות למרכז הלוגיסטי וסריקת מטענים חכמה.
      </p>
    </div>
  );
}

export default Incoming;
