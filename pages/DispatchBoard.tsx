import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import {
  DataStore,
  DriverStatusRecord,
  Order,
  ZoneCoverageSnapshot
} from '../data/types';
import { Toast } from '../src/components/Toast';
import { DispatchOrchestrator, ZoneCoverageResult } from '../src/lib/dispatchOrchestrator';

interface DispatchBoardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function DispatchBoard({ dataStore }: DispatchBoardProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [zones, setZones] = useState<ZoneCoverageSnapshot[]>([]);
  const [unassignedDrivers, setUnassignedDrivers] = useState<DriverStatusRecord[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hintColor = theme.hint_color || '#999999';
  const accentColor = theme.button_color || '#007aff';
  const orchestrator = useMemo(() => new DispatchOrchestrator(dataStore), [dataStore]);

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  const loadData = useCallback(async () => {
    if (!dataStore.listDriverStatuses) {
      setError('המערכת אינה תומכת במעקב אזורים עבור מוקדנים');
      setLoading(false);
      return;
    }

    try {
      const snapshot: ZoneCoverageResult = await orchestrator.getCoverage();
      setZones(snapshot.coverage);
      setUnassignedDrivers(snapshot.unassignedDrivers);
      setOutstandingOrders(snapshot.outstandingOrders);
      setError(null);
    } catch (err) {
      console.error('Failed to load dispatch data', err);
      setError('שגיאה בטעינת נתוני הכיסוי');
      Toast.error('שגיאה בטעינת נתוני הכיסוי');
    } finally {
      setLoading(false);
    }
  }, [dataStore, orchestrator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalOnline = zones.reduce((sum, zone) => sum + zone.onlineDrivers.length, 0);
  const activeDeliveries = outstandingOrders.filter((order) => order.status === 'out_for_delivery').length;
  const pendingAssignments = outstandingOrders.filter((order) => order.status !== 'out_for_delivery').length;

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    haptic('soft');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          padding: '20px',
          direction: 'rtl',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ height: '24px', width: '50%', backgroundColor: `${hintColor}30`, borderRadius: '8px' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: '120px', backgroundColor: `${hintColor}15`, borderRadius: '12px' }} />
        ))}
      </div>
    );
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>מוקד תפעול</h1>
          <p style={{ margin: 0, color: hintColor }}>מצב הכיסוי של אזורי המשלוח והזמינות של הנהגים בזמן אמת.</p>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: accentColor,
            color: theme.button_text_color || '#ffffff',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          רענן נתונים
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: '#ff3b3020',
            color: '#ff3b30'
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            border: `1px solid ${hintColor}30`
          }}
        >
          <div style={{ color: hintColor, marginBottom: '8px' }}>נהגים זמינים</div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>{totalOnline}</div>
        </div>
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            border: `1px solid ${hintColor}30`
          }}
        >
          <div style={{ color: hintColor, marginBottom: '8px' }}>אזורי פעילות</div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>{zones.length}</div>
        </div>
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            border: `1px solid ${hintColor}30`
          }}
        >
          <div style={{ color: hintColor, marginBottom: '8px' }}>נהגים ללא שיוך</div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>{unassignedDrivers.length}</div>
        </div>
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            border: `1px solid ${hintColor}30`
          }}
        >
          <div style={{ color: hintColor, marginBottom: '8px' }}>משלוחים פעילים</div>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>{activeDeliveries}</div>
          <div style={{ fontSize: '12px', color: hintColor }}>מוכנים ליציאה: {pendingAssignments}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {zones.map((coverage) => {
          const inventoryCount = coverage.inventory.reduce((sum, record) => sum + record.quantity, 0);
          return (
            <div
              key={coverage.zone.id}
              style={{
                borderRadius: '16px',
                padding: '16px',
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                border: `1px solid ${hintColor}30`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>{coverage.zone.name}</div>
                  {coverage.zone.description && <div style={{ color: hintColor, fontSize: '14px' }}>{coverage.zone.description}</div>}
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: coverage.onlineDrivers.length > 0 ? '#34c75920' : '#ff3b3020',
                    color: coverage.onlineDrivers.length > 0 ? '#34c759' : '#ff3b30',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  {coverage.onlineDrivers.length > 0 ? 'כיסוי פעיל' : 'ללא כיסוי'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', color: hintColor, flexWrap: 'wrap' }}>
                <span>נהגים זמינים: {coverage.onlineDrivers.length}</span>
                <span>נהגים פנויים: {coverage.idleDrivers.length}</span>
                <span>שיוכים פעילים: {coverage.assignments.length}</span>
                <span>משלוחים באזור: {coverage.outstandingOrders.length}</span>
                <span>יחידות מלאי ברכב: {inventoryCount}</span>
              </div>

              {coverage.onlineDrivers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {coverage.onlineDrivers.map((driver) => (
                    <div
                      key={driver.driver_id}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${hintColor}25`,
                        backgroundColor: theme.bg_color
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>נהג #{driver.driver_id}</div>
                      <div style={{ color: hintColor, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          סטטוס:{' '}
                          {driver.status === 'available'
                            ? 'זמין'
                            : driver.status === 'delivering'
                            ? 'במשלוח'
                            : driver.status === 'on_break'
                            ? 'בהפסקה'
                            : 'סיום משמרת'}
                        </span>
                        {driver.current_zone_id && (
                          <span style={{ fontSize: '12px' }}>אזור פעיל: {driver.current_zone_id}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unassignedDrivers.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>נהגים ללא שיוך אזור</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {unassignedDrivers.map((driver) => (
              <div
                key={driver.driver_id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${hintColor}25`,
                  backgroundColor: '#ffcc0020'
                }}
              >
                נהג #{driver.driver_id} • סטטוס {driver.status === 'available' ? 'זמין' : driver.status === 'delivering' ? 'במשלוח' : driver.status === 'on_break' ? 'בהפסקה' : 'סיום משמרת'}
              </div>
            ))}
          </div>
        </div>
      )}

      {outstandingOrders.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>משלוחים ממתינים</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {outstandingOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${hintColor}25`,
                  backgroundColor: theme.secondary_bg_color || '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{order.customer_name}</span>
                  <span style={{ fontSize: '12px', color: hintColor }}>{order.status}</span>
                </div>
                <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
                  {order.customer_address}
                </div>
                {order.assigned_driver && (
                  <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
                    נהג משויך: {order.assigned_driver}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
