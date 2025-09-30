import React, { useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface RestockRequestsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface RestockRequest {
  id: string;
  requester: string;
  item: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'ordered';
}

export function RestockRequests({ dataStore }: RestockRequestsProps) {
  const { theme, backButton } = useTelegramUI();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f6f6f6';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    const fallback: RestockRequest[] = [
      { id: 'RS-102', requester: 'צוות חנות דיזינגוף', item: 'ארגז פירות פרימיום', quantity: 25, priority: 'high', status: 'pending' },
      { id: 'RS-099', requester: 'צוות חנות חיפה', item: 'קפה אורגני 1ק"ג', quantity: 40, priority: 'medium', status: 'approved' },
      { id: 'RS-095', requester: 'צוות חנות באר שבע', item: 'קופסת עוגיות', quantity: 60, priority: 'low', status: 'ordered' }
    ];
    setRequests(fallback);

    dataStore.getProfile().catch(() => undefined);
  }, [dataStore]);

  const totals = useMemo(
    () => ({
      pending: requests.filter((req) => req.status === 'pending').length,
      approved: requests.filter((req) => req.status === 'approved').length,
      ordered: requests.filter((req) => req.status === 'ordered').length
    }),
    [requests]
  );

  const statusLabel = {
    pending: 'ממתין לאישור',
    approved: 'אושר',
    ordered: 'הוזמן'
  } as const;

  const statusColor = {
    pending: '#ff9500',
    approved: '#34c759',
    ordered: '#007aff'
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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>בקשות חידוש מלאי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        מעקב אחר כל הבקשות מהשטח והתקדמות האישור וההזמנה שלהן.
      </p>

      <section style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: subtleBackground, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>ממתינים</div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{totals.pending}</div>
        </div>
        <div style={{ backgroundColor: subtleBackground, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>אושרו</div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{totals.approved}</div>
        </div>
        <div style={{ backgroundColor: subtleBackground, padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>בהזמנה</div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{totals.ordered}</div>
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requests.map((request) => (
          <div
            key={request.id}
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              padding: '16px',
              borderRadius: '14px',
              border: `1px solid ${hintColor}30`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{request.item}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>{request.id}</span>
            </div>
            <div style={{ marginTop: '8px' }}>כמות מבוקשת: {request.quantity}</div>
            <div style={{ marginTop: '4px', color: hintColor }}>מבקש: {request.requester}</div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor:
                    request.priority === 'high'
                      ? '#ff3b3020'
                      : request.priority === 'medium'
                      ? '#ff950020'
                      : '#34c75920',
                  color:
                    request.priority === 'high'
                      ? '#ff3b30'
                      : request.priority === 'medium'
                      ? '#ff9500'
                      : '#34c759',
                  fontSize: '12px'
                }}
              >
                עדיפות: {request.priority === 'high' ? 'גבוהה' : request.priority === 'medium' ? 'בינונית' : 'נמוכה'}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor: `${statusColor[request.status]}20`,
                  color: statusColor[request.status],
                  fontSize: '12px'
                }}
              >
                {statusLabel[request.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
