import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface MyInventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface InventoryAssignment {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export function MyInventory({ dataStore }: MyInventoryProps) {
  const { theme, backButton } = useTelegramUI();
  const [items, setItems] = useState<InventoryAssignment[]>([]);
  const hintColor = theme.hint_color || '#999999';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  useEffect(() => {
    setItems([
      { id: 'PK-2201', name: 'ארגז מאפים', quantity: 12, unit: 'קופסאות', notes: 'מיועד למסעדה 45902' },
      { id: 'PK-2198', name: 'שתייה קלה', quantity: 8, unit: 'ארגזים', notes: 'שמור בקירור' },
      { id: 'PK-2195', name: 'מנות שף קפואות', quantity: 6, unit: 'מגש', notes: 'לבדוק טמפרטורה לפני יציאה' }
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>המלאי שלי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        רשימת המוצרים הנמצאים ברכב שלך, כולל הנחיות ויעדים ייעודיים.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{item.id}</span>
            </div>
            <div style={{ marginTop: '8px' }}>כמות: {item.quantity} {item.unit}</div>
            {item.notes && <div style={{ marginTop: '4px', color: hintColor }}>{item.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
