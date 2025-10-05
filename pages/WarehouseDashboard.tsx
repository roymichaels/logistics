import React, { useEffect, useMemo, useState } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import {
  DataStore,
  InventoryRecord,
  RestockRequest,
  InventoryLog,
  InventoryAlert
} from '../data/types';

interface WarehouseDashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface LocationSummary {
  id: string;
  name: string;
  onHand: number;
  reserved: number;
  damaged: number;
  skuCount: number;
  lowStockSkus: number;
}

export function WarehouseDashboard({ dataStore }: WarehouseDashboardProps) {
  const { theme, backButton } = useTelegramUI();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
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
        const [inventoryList, restockList, alertList, recentLogs] = await Promise.all([
          dataStore.listInventory ? dataStore.listInventory() : Promise.resolve([] as InventoryRecord[]),
          dataStore.listRestockRequests
            ? dataStore.listRestockRequests({ status: 'pending' })
            : Promise.resolve([] as RestockRequest[]),
          dataStore.getLowStockAlerts ? dataStore.getLowStockAlerts() : Promise.resolve([] as InventoryAlert[]),
          dataStore.listInventoryLogs ? dataStore.listInventoryLogs({ limit: 20 }) : Promise.resolve([] as InventoryLog[])
        ]);

        if (cancelled) return;

        const grouped = inventoryList.reduce<Record<string, LocationSummary>>((acc, record) => {
          const locationId = record.location_id;
          const existing = acc[locationId] || {
            id: locationId,
            name: record.location?.name || 'ללא מיקום',
            onHand: 0,
            reserved: 0,
            damaged: 0,
            skuCount: 0,
            lowStockSkus: 0
          };

          existing.onHand += record.on_hand_quantity;
          existing.reserved += record.reserved_quantity;
          existing.damaged += record.damaged_quantity;
          existing.skuCount += 1;
          if (record.on_hand_quantity <= Math.max(1, record.low_stock_threshold)) {
            existing.lowStockSkus += 1;
          }

          acc[locationId] = existing;
          return acc;
        }, {});

        const summaries = Object.values(grouped).sort((a, b) => b.onHand - a.onHand || a.name.localeCompare(b.name));

        setLocations(summaries);
        setRestockRequests(restockList);
        setAlerts(alertList);
        setLogs(recentLogs);
      } catch (error) {
        console.error('Failed to load warehouse dashboard data', error);
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
    const totalLocations = locations.length;
    const lowStockLocations = locations.filter((loc) => loc.lowStockSkus > 0).length;
    const totalAlerts = alerts.length;
    const pendingRestocks = restockRequests.length;

    return { totalLocations, lowStockLocations, totalAlerts, pendingRestocks };
  }, [alerts.length, locations, restockRequests.length]);

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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>מרכז מחסן</h1>
      <p style={{ margin: '0 0 24px', color: theme.hint_color }}>
        מעקב מלאי לפי מיקומים, בקשות חידוש פתוחות ותיעוד תנועות אחרונות.
      </p>

      <section
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          marginBottom: '28px'
        }}
      >
        <SummaryCard label={'סה"כ מיקומים'} value={summary.totalLocations} theme={theme} />
        <SummaryCard
          label="מיקומים עם מלאי נמוך"
          value={summary.lowStockLocations}
          theme={theme}
          accent="#ff9500"
        />
        <SummaryCard label="התראות מלאי" value={summary.totalAlerts} theme={theme} accent="#ff3b30" />
        <SummaryCard label="בקשות חידוש ממתינות" value={summary.pendingRestocks} theme={theme} accent="#007aff" />
      </section>

      {loading && <div style={{ marginBottom: '16px', color: theme.hint_color }}>טוען נתוני מחסן...</div>}

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>סטטוס לפי מיקום</h2>
        {locations.length === 0 ? (
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: theme.secondary_bg_color }}>
            אין נתוני מלאי זמינים.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locations.map((location) => (
              <div
                key={location.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: theme.secondary_bg_color,
                  border: `1px solid ${theme.hint_color}30`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{location.name}</strong>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>
                    {location.lowStockSkus} מוצרים עם מלאי נמוך
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px',
                    fontSize: '12px'
                  }}
                >
                  <div>זמין: <strong>{location.onHand}</strong></div>
                  <div>בהקצאה: <strong>{location.reserved}</strong></div>
                  <div>פגומים: <strong>{location.damaged}</strong></div>
                  <div>מק"טים במיקום: <strong>{location.skuCount}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>בקשות חידוש פתוחות</h2>
        {restockRequests.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין בקשות חידוש ממתינות.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {restockRequests.map((request) => (
              <div
                key={request.id}
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
                <div style={{ fontSize: '13px' }}>
                  כמות מבוקשת: <strong>{request.requested_quantity}</strong>
                </div>
                <div style={{ fontSize: '12px', color: theme.hint_color }}>
                  {request.from_location?.name || 'מקור לא משויך'} → {request.to_location?.name || 'יעד לא משויך'}
                </div>
                {request.notes && (
                  <div style={{ fontSize: '12px', color: theme.hint_color, marginTop: '4px' }}>{request.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>תנועות מלאי אחרונות</h2>
        {logs.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין תנועות מתועדות.</div>
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
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      direction: 'ltr',
                      backgroundColor: theme.bg_color,
                      padding: '6px',
                      borderRadius: '6px'
                    }}
                  >
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
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
