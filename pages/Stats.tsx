import React, { useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, User } from '../data/types';

interface StatsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Stats({ dataStore }: StatsProps) {
  const { theme, backButton } = useTelegramUI();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    let mounted = true;

    dataStore.getProfile()
      .then((profile) => {
        if (mounted) {
          setUser(profile);
        }
      })
      .catch((error) => {
        console.warn('Failed to load profile for stats page:', error);
      });

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const metrics = useMemo(
    () => [
      { title: 'הזמנות פתוחות', value: '128', change: '+12% לעומת השבוע שעבר' },
      { title: 'הכנסות חודשיות', value: '₪89,540', change: '+8% לעומת החודש שעבר' },
      { title: 'שביעות רצון לקוחות', value: '4.8/5', change: '15 ביקורות חדשות' },
      { title: 'זמן אספקה ממוצע', value: '2.5 ימים', change: 'מהיר ב-0.4 ימים' }
    ],
    []
  );

  const operationalInsights = useMemo(
    () => [
      { title: 'צוות מחסן', detail: '93% המשימות הושלמו בזמן' },
      { title: 'צוות נהגים', detail: '85% מסלולים הסתיימו לפני הזמן' },
      { title: 'צוות מכירות', detail: '18 עסקאות חדשות השבוע' }
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>
        לוח ביצועים {user?.name ? `• ${user.name}` : ''}
      </h1>

      <p style={{ margin: '0 0 24px', color: theme.hint_color }}>
        תמונת מצב עדכנית של העסק עם מגמות ונתונים מרכזיים לקבלת החלטות מהירה.
      </p>

      <section style={{ display: 'grid', gap: '12px' }}>
        {metrics.map((metric) => (
          <div
            key={metric.title}
            style={{
              backgroundColor: theme.secondary_bg_color || '#f7f7f7',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>{metric.title}</h2>
            <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>{metric.value}</div>
            <div style={{ fontSize: '14px', color: theme.hint_color }}>{metric.change}</div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: '28px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>תובנות תפעוליות</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {operationalInsights.map((insight) => (
            <div
              key={insight.title}
              style={{
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${theme.hint_color}30`
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{insight.title}</div>
              <div style={{ color: theme.hint_color }}>{insight.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
