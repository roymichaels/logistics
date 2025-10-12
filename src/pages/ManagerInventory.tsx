import React, { useEffect, useMemo, useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { useTelegramUI } from '../hooks/useTelegramUI';
import {
  DataStore,
  InventoryRecord,
  RestockRequest,
  InventoryAlert,
  InventoryLog
} from '../data/types';

interface ManagerInventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
  locations: number;
}

export function ManagerInventory({ dataStore }: ManagerInventoryProps) {
  const { theme, backButton } = useTelegramUI();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RestockRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<RestockRequest[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [inventoryList, pendingList, approvedList, alertList, recentLogs] = await Promise.all([
          dataStore.listInventory ? dataStore.listInventory() : Promise.resolve([] as InventoryRecord[]),
          dataStore.listRestockRequests
            ? dataStore.listRestockRequests({ status: 'pending' })
            : Promise.resolve([] as RestockRequest[]),
          dataStore.listRestockRequests
            ? dataStore.listRestockRequests({ status: 'approved' })
            : Promise.resolve([] as RestockRequest[]),
          dataStore.getLowStockAlerts ? dataStore.getLowStockAlerts() : Promise.resolve([] as InventoryAlert[]),
          dataStore.listInventoryLogs ? dataStore.listInventoryLogs({ limit: 20 }) : Promise.resolve([] as InventoryLog[])
        ]);

        if (cancelled) return;

        const grouped = inventoryList.reduce<Record<string, ProductSummary>>((acc, record) => {
          const existing = acc[record.product_id] || {
            id: record.product_id,
            name: record.product?.name || record.product_id,
            sku: record.product?.sku || record.product_id,
            onHand: 0,
            reserved: 0,
            lowStockThreshold: record.low_stock_threshold,
            locations: 0
          };

          existing.onHand += record.on_hand_quantity;
          existing.reserved += record.reserved_quantity;
          existing.lowStockThreshold = Math.min(existing.lowStockThreshold, record.low_stock_threshold);
          existing.locations += 1;

          acc[record.product_id] = existing;
          return acc;
        }, {});

        const summaries = Object.values(grouped).sort((a, b) => {
          const aIsLow = a.onHand <= Math.max(1, a.lowStockThreshold);
          const bIsLow = b.onHand <= Math.max(1, b.lowStockThreshold);
          if (aIsLow && !bIsLow) return -1;
          if (!aIsLow && bIsLow) return 1;
          return a.onHand - b.onHand;
        });

        setProducts(summaries);
        setPendingRequests(pendingList);
        setApprovedRequests(approvedList);
        setAlerts(alertList);
        setLogs(recentLogs);
      } catch (error) {
        console.error('Failed to load manager inventory data', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dataStore]);

  const summary = useMemo(() => {
    const lowStockSku = products.filter((product) => product.onHand <= Math.max(1, product.lowStockThreshold)).length;
    const pending = pendingRequests.length;
    const approved = approvedRequests.length;
    const alertCount = alerts.length;
    return { lowStockSku, pending, approved, alertCount };
  }, [alerts.length, approvedRequests.length, pendingRequests.length, products]);

  return (
    <div
      style={{
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        minHeight: '100vh',
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>בקרת מלאי למנהלים</h1>
      <p style={{ margin: '0 0 24px', color: theme.hint_color }}>
        סקירה מהירה של מלאי חסר, בקשות חידוש ממתינות ותנועות בולטות.
      </p>

      <section
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          marginBottom: '28px'
        }}
      >
        <SummaryCard label="מוצרים בחוסר" value={summary.lowStockSku} theme={theme} accent="#ff3b30" />
        <SummaryCard label="בקשות לאישור" value={summary.pending} theme={theme} accent="#ff9500" />
        <SummaryCard label="מאושרות ממתינות" value={summary.approved} theme={theme} accent="#007aff" />
        <SummaryCard label="התראות" value={summary.alertCount} theme={theme} accent={theme.button_color} />
      </section>

      {loading && <div style={{ marginBottom: '16px', color: theme.hint_color }}>טוען נתונים...</div>}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>מוצרים עם מלאי נמוך</h2>
        {products.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין נתונים להצגה.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.slice(0, 10).map((product) => {
              const isLow = product.onHand <= Math.max(1, product.lowStockThreshold);
              return (
                <div
                  key={product.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: theme.secondary_bg_color,
                    border: `1px solid ${theme.hint_color}30`,
                    boxShadow: isLow ? `0 0 0 2px #ff3b3030` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>{product.name}</strong>
                    <span style={{ fontSize: '12px', color: theme.hint_color }}>SKU: {product.sku}</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    זמין: <strong>{product.onHand}</strong> | בהקצאה: <strong>{product.reserved}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.hint_color }}>
                    מיקומים פעילים: {product.locations} | סף התראה: {product.lowStockThreshold}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>בקשות ממתינות לאישור</h2>
        {pendingRequests.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין בקשות לאישור.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingRequests.map((request) => (
              <RequestCard key={request.id} request={request} theme={theme} />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>בקשות מאושרות</h2>
        {approvedRequests.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין בקשות מאושרות הממתינות לטיפול.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {approvedRequests.map((request) => (
              <RequestCard key={request.id} request={request} theme={theme} showApproval />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>תנועות מלאי אחרונות</h2>
        {logs.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין תיעוד זמין.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: theme.secondary_bg_color,
                  border: `1px solid ${theme.hint_color}30`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>{log.product?.name || log.product_id}</strong>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>
                    {new Date(log.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div style={{ fontSize: '13px' }}>
                  שינוי: <strong>{log.quantity_change}</strong> ({log.change_type})
                </div>
                {(log.from_location || log.to_location) && (
                  <div style={{ fontSize: '12px', color: theme.hint_color }}>
                    {log.from_location?.name || '—'} → {log.to_location?.name || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
  accent
}: {
  label: string;
  value: number;
  theme: any;
  accent?: string;
}) {
  const color = accent || theme.text_color;
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: theme.secondary_bg_color,
        border: `1px solid ${theme.hint_color}30`
      }}
    >
      <div style={{ fontSize: '13px', color: theme.hint_color, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function RequestCard({
  request,
  theme,
  showApproval
}: {
  request: RestockRequest;
  theme: any;
  showApproval?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '10px',
        backgroundColor: theme.secondary_bg_color,
        border: `1px solid ${theme.hint_color}30`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <strong>{request.product?.name || request.product_id}</strong>
        <span style={{ fontSize: '12px', color: theme.hint_color }}>
          {new Date(request.created_at).toLocaleString('he-IL')}
        </span>
      </div>
      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
        כמות מבוקשת: <strong>{request.requested_quantity}</strong>
      </div>
      {request.approved_quantity && (
        <div style={{ fontSize: '12px', color: theme.hint_color, marginBottom: '4px' }}>
          כמות מאושרת: <strong>{request.approved_quantity}</strong>
        </div>
      )}
      <div style={{ fontSize: '12px', color: theme.hint_color }}>
        {request.from_location?.name || 'מקור לא משויך'} → {request.to_location?.name || 'יעד לא משויך'}
      </div>
      {showApproval && request.approved_by && (
        <div style={{ fontSize: '12px', color: theme.hint_color, marginTop: '4px' }}>
          אושר על ידי: {request.approved_by}
        </div>
      )}
    </div>
  );
}
