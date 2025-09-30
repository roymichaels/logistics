import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, DriverInventoryRecord } from '../data/types';

interface MyInventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function MyInventory({ dataStore }: MyInventoryProps) {
  const { theme, backButton } = useTelegramUI();
  const [items, setItems] = useState<DriverInventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const hintColor = theme.hint_color || '#999999';

  useEffect(() => {
    backButton.hide();
    let cancelled = false;

    const loadDriverInventory = async () => {
      try {
        const profile = await dataStore.getProfile();

        if (!dataStore.listDriverInventory) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        const results = await dataStore.listDriverInventory({ driver_id: profile.telegram_id });
        if (!cancelled) {
          setItems(results);
        }
      } catch (error) {
        console.warn('Failed to load driver inventory:', error);
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDriverInventory();

    return () => {
      cancelled = true;
    };
  }, [backButton, dataStore]);

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
        {loading && <div style={{ color: hintColor }}>טוען מלאי אישי...</div>}
        {!loading && items.length === 0 && (
          <div
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`,
              color: hintColor,
              textAlign: 'center'
            }}
          >
            אין פריטים שהוקצו לך כרגע.
          </div>
        )}
        {!loading && items.map((item) => (
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
              <span style={{ fontWeight: 600 }}>{item.product?.name || item.product_id}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>#{item.product_id.slice(0, 8)}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
              SKU: {item.product?.sku || item.product_id}
            </div>
            <div style={{ marginTop: '8px' }}>כמות ברכב: {item.quantity}</div>
            {item.product?.warehouse_location && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
                מקור: {item.product.warehouse_location}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
