import React, { useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, RestockRequest, RolePermissions } from '../data/types';

interface RestockRequestsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function RestockRequests({ dataStore }: RestockRequestsProps) {
  const { theme, backButton } = useTelegramUI();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f6f6f6';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      try {
        const [perms, list] = await Promise.all([
          dataStore.getRolePermissions ? dataStore.getRolePermissions() : Promise.resolve(null),
          dataStore.listRestockRequests ? dataStore.listRestockRequests({ status: 'all' }) : Promise.resolve([] as RestockRequest[])
        ]);

        if (cancelled) return;

        if (perms) {
          setPermissions(perms);
        }

        setRequests(list);
      } catch (error) {
        console.warn('Failed to load restock requests:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRequests();
    dataStore.getProfile().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [dataStore]);

  const totals = useMemo(
    () => ({
      pending: requests.filter((req) => req.status === 'pending').length,
      approved: requests.filter((req) => req.status === 'approved').length,
      fulfilled: requests.filter((req) => req.status === 'fulfilled').length
    }),
    [requests]
  );

  const statusLabel: Record<RestockRequest['status'], string> = {
    pending: 'ממתין לאישור',
    approved: 'אושר',
    fulfilled: 'סופק',
    rejected: 'נדחה'
  };

  const statusColor: Record<RestockRequest['status'], string> = {
    pending: '#ff9500',
    approved: '#34c759',
    fulfilled: '#007aff',
    rejected: '#ff3b30'
  };

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
        <div style={{ fontSize: '14px', color: hintColor }}>סופקו</div>
        <div style={{ fontSize: '22px', fontWeight: 600 }}>{totals.fulfilled}</div>
      </div>
    </section>

    {permissions?.can_approve_restock && (
      <div style={{
        backgroundColor: theme.secondary_bg_color || '#ffffff',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '16px',
        color: hintColor
      }}>
        יש לך הרשאה לאשר או לעדכן בקשות חידוש דרך מסך זה.
      </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && (
          <div style={{ color: hintColor }}>טוען בקשות חידוש...</div>
        )}
        {!loading && requests.length === 0 && (
          <div
            style={{
              backgroundColor: theme.secondary_bg_color || '#ffffff',
              padding: '20px',
              borderRadius: '14px',
              color: hintColor,
              textAlign: 'center'
            }}
          >
            אין בקשות חידוש פעילות.
          </div>
        )}
        {!loading && requests.map((request) => (
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
              <span style={{ fontWeight: 600 }}>{request.product?.name || 'מוצר לא ידוע'}</span>
              <span style={{ fontSize: '12px', color: hintColor }}>#{request.id.slice(0, 8)}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
              SKU: {request.product?.sku || request.product_id}
            </div>
            <div style={{ marginTop: '8px' }}>כמות מבוקשת: {request.requested_quantity}</div>
            {request.approved_quantity !== null && request.approved_quantity !== undefined && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
                כמות מאושרת: {request.approved_quantity}
              </div>
            )}
            <div style={{ marginTop: '4px', color: hintColor }}>מבקש: {request.requested_by}</div>
            <div style={{ marginTop: '4px', color: hintColor, fontSize: '12px' }}>
              נוצר: {new Date(request.created_at).toLocaleString('he-IL')}
            </div>
            {request.notes && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: hintColor }}>
                הערות: {request.notes}
              </div>
            )}
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {request.fulfilled_by && (
                <span style={{ fontSize: '12px', color: hintColor }}>
                  סופק ע"י {request.fulfilled_by}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
