import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface MyZonesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface Zone {
  id: string;
  name: string;
  deliveriesToday: number;
  notes?: string;
}

export function MyZones({ dataStore }: MyZonesProps) {
  const { theme, backButton } = useTelegramUI();
  const [zones, setZones] = useState<Zone[]>([]);
  const hintColor = theme.hint_color || '#999999';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  useEffect(() => {
    setZones([
      { id: 'ZN-01', name: 'מרכז תל אביב', deliveriesToday: 8, notes: 'אזור חניה מוגבל - מומלץ להשתמש באופנוע' },
      { id: 'ZN-02', name: 'צפון תל אביב', deliveriesToday: 6, notes: 'עומסי תנועה בין 13:00-15:00' },
      { id: 'ZN-05', name: 'הרצליה ורמת השרון', deliveriesToday: 4 }
    ]);
  }, []);

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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>האזורים שלי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        רשימת האזורים בהם אתה פעיל היום עם הערות חשובות לתכנון המסלול.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{zone.name}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{zone.id}</span>
            </div>
            <div style={{ marginTop: '8px' }}>משלוחים מתוכננים היום: {zone.deliveriesToday}</div>
            {zone.notes && <div style={{ marginTop: '4px', color: hintColor }}>{zone.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
