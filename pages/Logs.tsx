import React, { useEffect, useMemo } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface LogsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Logs({ dataStore }: LogsProps) {
  const { theme, backButton } = useTelegramUI();
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f8f8f8';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  const entries = useMemo(
    () => [
      {
        id: 'LG-5521',
        time: '09:45',
        actor: 'יעל כהן',
        action: 'עדכנה את מלאי SKU BX-VEG-001 ל-86 יחידות'
      },
      {
        id: 'LG-5518',
        time: '08:20',
        actor: 'אפליקציית נהג',
        action: 'משלוח 45902 סומן כמסופק בהצלחה'
      },
      {
        id: 'LG-5512',
        time: 'אתמול • 19:10',
        actor: 'דוחות מערכת',
        action: 'נוצר דו"ח ביצועים יומי ונשלח למנהלים'
      }
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>יומן פעילות</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        שקיפות מלאה על השינויים האחרונים במערכת לצורך בקרת איכות ותחקור מהיר.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              backgroundColor: subtleBackground,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{entry.actor}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{entry.time}</span>
            </div>
            <div style={{ marginTop: '8px' }}>{entry.action}</div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: hintColor }}>#{entry.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
