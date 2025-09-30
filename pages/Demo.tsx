import React, { useEffect } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface DemoProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Demo({ onNavigate }: DemoProps) {
  const { theme, backButton } = useTelegramUI();

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  return (
    <div
      style={{
        padding: '24px',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: theme.text_color
      }}
    >
      <h2 style={{ margin: 0 }}>מצב דמו</h2>
      <p style={{ margin: 0, color: theme.hint_color }}>
        כאן יוצגו תרחישי הדגמה ומסלולי הדרכה בהתאם לתפקיד. מסך זה נמצא כרגע בבנייה.
      </p>
      <button
        onClick={() => onNavigate('dashboard')}
        style={{
          alignSelf: 'flex-start',
          padding: '10px 18px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          cursor: 'pointer'
        }}
      >
        חזרה ללוח הבקרה
      </button>
    </div>
  );
}
