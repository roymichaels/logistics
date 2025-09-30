import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface DriverStatusProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface StatusOption {
  id: 'available' | 'on_break' | 'delivering' | 'off_shift';
  label: string;
  description: string;
}

export function DriverStatus({ dataStore }: DriverStatusProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [activeStatus, setActiveStatus] = useState<StatusOption['id']>('available');
  const hintColor = theme.hint_color || '#999999';
  const accentColor = theme.button_color || '#007aff';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  const options: StatusOption[] = [
    { id: 'available', label: 'זמין למשלוחים', description: 'מוכן לקבל משימות חדשות' },
    { id: 'delivering', label: 'באמצע מסירה', description: 'בטיפול במשלוח נוכחי' },
    { id: 'on_break', label: 'בהפסקה', description: 'זמן מנוחה או טעינת רכב' },
    { id: 'off_shift', label: 'סיום משמרת', description: 'לא זמין לעבודה' }
  ];

  const statusMessage = {
    available: 'מערכת השליחים תנתב אליך משלוחים חדשים.',
    delivering: 'השאירו עדכונים על המסירה ללקוחות ולמוקד.',
    on_break: 'ודא לעדכן כאשר אתה חוזר לפעילות כדי לקבל שוב משימות.',
    off_shift: 'נסיעה טובה! תוכל להפעיל את הסטטוס הזמין כשאתה מוכן.'
  } as const;

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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>סטטוס נהג</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        עדכן את מצבך הנוכחי כדי שמוקד התפעול ידע להקצות לך משימות בצורה מיטבית.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((option) => {
          const isActive = option.id === activeStatus;
          return (
            <button
              key={option.id}
              onClick={() => {
                setActiveStatus(option.id);
                haptic('medium');
              }}
              style={{
                textAlign: 'right',
                border: `1px solid ${isActive ? accentColor : `${hintColor}30`}`,
                backgroundColor: isActive ? `${accentColor}20` : (theme.secondary_bg_color || '#f5f5f5'),
                color: theme.text_color,
                borderRadius: '14px',
                padding: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{option.label}</div>
              <div style={{ color: hintColor }}>{option.description}</div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '28px',
          backgroundColor: theme.secondary_bg_color || '#f1f1f1',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${hintColor}30`
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>הנחיות</h2>
        <p style={{ margin: 0, color: hintColor }}>{statusMessage[activeStatus]}</p>
      </div>
    </div>
  );
}
