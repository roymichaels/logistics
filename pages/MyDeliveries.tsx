import React, { useEffect, useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface MyDeliveriesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface Delivery {
  id: string;
  customer: string;
  address: string;
  window: string;
  status: 'assigned' | 'in_progress' | 'delivered';
}

export function MyDeliveries({ dataStore }: MyDeliveriesProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const hintColor = theme.hint_color || '#999999';

  useEffect(() => {
    backButton.hide();
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  useEffect(() => {
    setDeliveries([
      {
        id: 'DL-78201',
        customer: 'מאפיית השדרה',
        address: 'בן יהודה 128, תל אביב',
        window: '10:00 - 12:00',
        status: 'assigned'
      },
      {
        id: 'DL-78195',
        customer: 'מרכז טבעי',
        address: 'שדרות ההסתדרות 45, חיפה',
        window: '12:00 - 14:00',
        status: 'in_progress'
      },
      {
        id: 'DL-78188',
        customer: 'קפה הצפון',
        address: 'אלנבי 45, תל אביב',
        window: '14:00 - 16:00',
        status: 'delivered'
      }
    ]);
  }, []);

  const handleStatusChange = (id: string, status: Delivery['status']) => {
    setDeliveries((prev) =>
      prev.map((delivery) => (delivery.id === id ? { ...delivery, status } : delivery))
    );
    haptic('light');
  };

  const statusLabel = {
    assigned: 'מוכן ליציאה',
    in_progress: 'בדרך',
    delivered: 'סופק'
  } as const;

  const statusColor = {
    assigned: '#007aff',
    in_progress: '#ff9500',
    delivered: '#34c759'
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>משלוחים שלי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        המסלול היומי שלך עם סטטוס עדכני ומידע על הלקוחות.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{delivery.customer}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{delivery.id}</span>
            </div>
            <div style={{ marginTop: '8px' }}>{delivery.address}</div>
            <div style={{ marginTop: '4px', color: hintColor }}>חלון אספקה: {delivery.window}</div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['assigned', 'in_progress', 'delivered'] as Delivery['status'][]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(delivery.id, status)}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    backgroundColor:
                      delivery.status === status
                        ? `${statusColor[status]}20`
                        : (theme.secondary_bg_color || '#f4f4f4'),
                    color: delivery.status === status ? statusColor[status] : hintColor,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
