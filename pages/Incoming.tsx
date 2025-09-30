import React, { useEffect, useMemo } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface IncomingProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Incoming({ dataStore }: IncomingProps) {
  const { theme, backButton } = useTelegramUI();
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f6f6f6';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  const shipments = useMemo(
    () => [
      {
        supplier: 'Fresh Supply Co.',
        eta: 'היום • 14:30',
        reference: 'PO-4582',
        pallets: 12,
        status: 'בדרך'
      },
      {
        supplier: 'Baker House',
        eta: 'מחר • 09:15',
        reference: 'PO-4589',
        pallets: 6,
        status: 'מאושר'
      },
      {
        supplier: 'Urban Market',
        eta: 'היום • 18:00',
        reference: 'PO-4592',
        pallets: 8,
        status: 'דורש תשומת לב'
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>משלוחים נכנסים</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        מעקב בזמן אמת אחר משלוחים נכנסים, סטטוס קליטה ותיאום צוותים.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {shipments.map((shipment) => (
          <div
            key={shipment.reference}
            style={{
              backgroundColor: subtleBackground,
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{shipment.supplier}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{shipment.reference}</span>
            </div>
            <div style={{ marginTop: '8px' }}>ETA: {shipment.eta}</div>
            <div style={{ marginTop: '4px', color: hintColor }}>משטחים: {shipment.pallets}</div>
            <div style={{ marginTop: '12px' }}>
              <span
                style={{
                  backgroundColor:
                    shipment.status === 'בדרך'
                      ? '#007aff20'
                      : shipment.status === 'מאושר'
                      ? '#34c75920'
                      : '#ff950020',
                  color:
                    shipment.status === 'בדרך'
                      ? '#007aff'
                      : shipment.status === 'מאושר'
                      ? '#34c759'
                      : '#ff9500',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px'
                }}
              >
                {shipment.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
