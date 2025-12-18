import React, { useEffect, useMemo, useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

import { DataStore, User } from '../data/types';
import { logger } from '../lib/logger';

interface MyStatsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function MyStats({ dataStore }: MyStatsProps) {

  const [user, setUser] = useState<User | null>(null);
  const accentColor = '#007aff';
  const subtleBackground = '#f4f4f4';
  const hintColor = '#999999';

  useEffect(() => {
    let mounted = true;
    dataStore
      .getProfile()
      .then((profile) => {
        if (mounted) {
          setUser(profile);
        }
      })
      .catch((error) => logger.warn('Failed to load profile for my stats page:', error));

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const performance = useMemo(
    () => [
      { label: 'יעד חודשי', value: '₪120,000', progress: 74 },
      { label: 'עסקאות סגורות', value: '32', progress: 58 },
      { label: 'לקוחות פעילים', value: '18', progress: 82 }
    ],
    []
  );

  const leaderboard = useMemo(
    () => [
      { name: 'את', value: '₪88,450', highlight: true },
      { name: 'גלעד', value: '₪81,320' },
      { name: 'נועה', value: '₪73,980' }
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
        הביצועים שלי {user?.name ? `• ${user.name}` : ''}
      </h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        מעקב אחרי היעדים, העמלות וההזדמנויות האחרונות שלך.
      </p>

      <section style={{ display: 'grid', gap: '16px' }}>
        {performance.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: '14px',
              backgroundColor: subtleBackground,
              padding: '16px'
            }}
          >
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>{item.value}</div>
            <div
              style={{
                height: '8px',
                borderRadius: '999px',
                backgroundColor: `${hintColor}40`,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  backgroundColor: accentColor,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: '28px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>טבלת מכירות</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {leaderboard.map((row) => (
            <div
              key={row.name}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${row.highlight ? accentColor : `${hintColor}30`}`,
                backgroundColor: row.highlight
                  ? `${accentColor}20`
                  : subtleBackground
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: row.highlight ? 700 : 500 }}>
                  {row.name}
                  {row.highlight ? ' (את)' : ''}
                </span>
                <span>{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
