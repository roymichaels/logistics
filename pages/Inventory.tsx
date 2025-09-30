import React, { useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, Product } from '../data/types';

interface InventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface InventoryItem {
  name: string;
  sku: string;
  stock: number;
  location: string;
  status: 'in_stock' | 'low' | 'out';
}

export function Inventory({ dataStore }: InventoryProps) {
  const { theme, backButton } = useTelegramUI();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const accentColor = theme.button_color || '#007aff';
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f5f5f5';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    let mounted = true;
    const fallback: InventoryItem[] = [
      { name: 'ארגז ירקות עונתי', sku: 'BX-VEG-001', stock: 86, location: 'מדף A3', status: 'in_stock' },
      { name: 'גבינת עזים', sku: 'CH-GL-204', stock: 18, location: 'קירור B1', status: 'low' },
      { name: 'קפה אורגני 1ק"ג', sku: 'CF-OR-552', stock: 0, location: 'מדף D4', status: 'out' }
    ];
    setItems(fallback);

    if (!dataStore.listProducts) {
      return () => {
        mounted = false;
      };
    }

    dataStore
      .listProducts({})
      .then((products) => {
        if (!mounted) {
          return;
        }

        if (products && products.length) {
          const normalized = products.slice(0, 10).map<InventoryItem>((product: Product) => ({
            name: product.name,
            sku: product.sku,
            stock: product.stock_quantity,
            location: product.warehouse_location || 'לא הוגדר',
            status: product.stock_quantity === 0 ? 'out' : product.stock_quantity < 25 ? 'low' : 'in_stock'
          }));
          setItems(normalized);
        }
      })
      .catch((error) => console.warn('Failed to load products for inventory view:', error));

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const summary = useMemo(
    () => ({
      totalSku: items.length,
      lowStock: items.filter((item) => item.status === 'low').length,
      outOfStock: items.filter((item) => item.status === 'out').length
    }),
    [items]
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>ניהול מלאי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        בקרה חכמה על רמות מלאי, התראות על חוסרים ופעולות חידוש מהירות.
      </p>

      <section style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>סה"כ מק"טים במעקב</div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{summary.totalSku}</div>
        </div>
        <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>חוסרים מתקרבים</div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: summary.lowStock ? '#ff9500' : theme.text_color }}>
            {summary.lowStock}
          </div>
        </div>
        <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>חוסר מלאי</div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: summary.outOfStock ? '#ff3b30' : theme.text_color }}>
            {summary.outOfStock}
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.sku}
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>{item.name}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>SKU: {item.sku}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>מלאי: {item.stock}</span>
              <span>מיקום: {item.location}</span>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor:
                    item.status === 'in_stock'
                      ? `${accentColor}20`
                      : item.status === 'low'
                      ? '#ff950020'
                      : '#ff3b3020',
                  color:
                    item.status === 'in_stock'
                      ? accentColor
                      : item.status === 'low'
                      ? '#ff9500'
                      : '#ff3b30',
                  fontSize: '12px'
                }}
              >
                {item.status === 'in_stock' ? 'במלאי' : item.status === 'low' ? 'מלאי נמוך' : 'חסר במלאי'}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
