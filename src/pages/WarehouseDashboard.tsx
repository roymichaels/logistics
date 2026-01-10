import React, { useEffect, useMemo, useState } from 'react';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../components/underground/UndergroundStatCard';
import { logger } from '../lib/logger';
import {
  DataStore,
  InventoryRecord,
  RestockRequest,
  InventoryLog,
  InventoryAlert
} from '../data/types';

interface WarehouseDashboardProps {
  dataStore: DataStore;
  onNavigate?: (page: string) => void;
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

export function WarehouseDashboard({ dataStore, onNavigate = () => {} }: WarehouseDashboardProps) {

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

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
        logger.error('Failed to load warehouse dashboard data', error);
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
        background: undergroundTheme.colors.gradient.primary,
        color: undergroundTheme.colors.text.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        paddingBottom: undergroundTheme.spacing['8xl'],
        direction: 'rtl'
      }}
    >
      <h1 style={{
        fontSize: undergroundTheme.typography.fontSize['4xl'],
        fontWeight: undergroundTheme.typography.fontWeight.bold,
        margin: `0 0 ${undergroundTheme.spacing.sm} 0`,
        textShadow: undergroundTheme.shadows.glow.cyan
      }}>
        מרכז מחסן
      </h1>
      <p style={{
        margin: `0 0 ${undergroundTheme.spacing['3xl']} 0`,
        color: undergroundTheme.colors.text.secondary,
        fontSize: undergroundTheme.typography.fontSize.lg
      }}>
        מעקב מלאי לפי מיקומים, בקשות חידוש פתוחות ותיעוד תנועות אחרונות.
      </p>

      <section
        style={{
          display: 'grid',
          gap: undergroundTheme.spacing.lg,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          marginBottom: undergroundTheme.spacing['4xl']
        }}
      >
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📍</span>}
          label='סה"כ מיקומים'
          value={summary.totalLocations}
          accentColor={undergroundTheme.colors.accent.primary}
          onClick={() => onNavigate('inventory')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>⚠️</span>}
          label="מיקומים עם מלאי נמוך"
          value={summary.lowStockLocations}
          accentColor={undergroundTheme.colors.status.warning}
          onClick={() => onNavigate('inventory?filter=lowStock')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>🔔</span>}
          label="התראות מלאי"
          value={summary.totalAlerts}
          accentColor={undergroundTheme.colors.status.error}
          onClick={() => onNavigate('my-inventory?alerts=true')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📦</span>}
          label="בקשות חידוש ממתינות"
          value={summary.pendingRestocks}
          accentColor={undergroundTheme.colors.status.info}
          onClick={() => onNavigate('restock-requests')}
        />
      </section>

      {loading && <div style={{ marginBottom: undergroundTheme.spacing.lg, color: undergroundTheme.colors.text.secondary }}>טוען נתוני מחסן...</div>}

      <section style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
          color: undergroundTheme.colors.text.primary
        }}>
          סטטוס לפי מיקום
        </h2>
        {locations.length === 0 ? (
          <UndergroundCard>
            אין נתוני מלאי זמינים.
          </UndergroundCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {locations.map((location) => (
              <UndergroundCard
                key={location.id}
                hover
                onClick={() => onNavigate(`inventory?location=${location.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.sm }}>
                  <strong style={{
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {location.name}
                  </strong>
                  <span style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: location.lowStockSkus > 0 ? undergroundTheme.colors.status.warning : undergroundTheme.colors.text.tertiary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold
                  }}>
                    {location.lowStockSkus} מוצרים עם מלאי נמוך
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: undergroundTheme.spacing.sm,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary
                  }}
                >
                  <div>זמין: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.onHand}</strong></div>
                  <div>בהקצאה: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.reserved}</strong></div>
                  <div>פגומים: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.damaged}</strong></div>
                  <div>מק"טים במיקום: <strong style={{ color: undergroundTheme.colors.text.primary }}>{location.skuCount}</strong></div>
                </div>
              </UndergroundCard>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
          color: undergroundTheme.colors.text.primary
        }}>
          בקשות חידוש פתוחות
        </h2>
        {restockRequests.length === 0 ? (
          <UndergroundCard>
            <div style={{ color: undergroundTheme.colors.text.secondary }}>אין בקשות חידוש ממתינות.</div>
          </UndergroundCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.sm }}>
            {restockRequests.map((request) => (
              <UndergroundCard key={request.id} variant="light">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.xs }}>
                  <strong style={{
                    fontSize: undergroundTheme.typography.fontSize.base,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {request.product?.name || request.product_id}
                  </strong>
                  <span style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary
                  }}>
                    {new Date(request.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  כמות מבוקשת: <strong style={{ color: undergroundTheme.colors.accent.primary }}>{request.requested_quantity}</strong>
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary
                }}>
                  {request.from_location?.name || 'מקור לא משויך'} → {request.to_location?.name || 'יעד לא משויך'}
                </div>
                {request.notes && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginTop: undergroundTheme.spacing.xs,
                    fontStyle: 'italic'
                  }}>
                    {request.notes}
                  </div>
                )}
              </UndergroundCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
          color: undergroundTheme.colors.text.primary
        }}>
          תנועות מלאי אחרונות
        </h2>
        {logs.length === 0 ? (
          <UndergroundCard>
            <div style={{ color: undergroundTheme.colors.text.secondary }}>אין תנועות מתועדות.</div>
          </UndergroundCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.sm }}>
            {logs.map((log) => (
              <UndergroundCard key={log.id} variant="light">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.xs }}>
                  <strong style={{
                    fontSize: undergroundTheme.typography.fontSize.base,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {log.product?.name || log.product_id}
                  </strong>
                  <span style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary
                  }}>
                    {new Date(log.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  שינוי: <strong style={{
                    color: log.quantity_change > 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.status.error
                  }}>
                    {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                  </strong> ({log.change_type})
                </div>
                {(log.from_location || log.to_location) && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginTop: undergroundTheme.spacing.xs
                  }}>
                    {log.from_location?.name || '—'} → {log.to_location?.name || '—'}
                  </div>
                )}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre
                    style={{
                      marginTop: undergroundTheme.spacing.sm,
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      direction: 'ltr',
                      background: undergroundTheme.colors.background.deepDark,
                      padding: undergroundTheme.spacing.sm,
                      borderRadius: undergroundTheme.borderRadius.sm,
                      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      color: undergroundTheme.colors.text.tertiary,
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </UndergroundCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
