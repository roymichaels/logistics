import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useRoleTheme } from '../hooks/useRoleTheme';
import {
  DataStore,
  DriverStatusRecord,
  Order,
  ZoneCoverageSnapshot
} from '../data/types';
import { Toast } from '../components/Toast';
import { DispatchOrchestrator, ZoneCoverageResult } from '../lib/dispatchOrchestrator';
import { telegram } from '../lib/telegram';

interface DispatchBoardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

export function DispatchBoard({ dataStore }: DispatchBoardProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const { colors, styles } = useRoleTheme();
  const [zones, setZones] = useState<ZoneCoverageSnapshot[]>([]);
  const [unassignedDrivers, setUnassignedDrivers] = useState<DriverStatusRecord[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDriverSelector, setShowDriverSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const orchestrator = useMemo(() => new DispatchOrchestrator(dataStore), [dataStore]);
  const supabase = (dataStore as any).supabase;

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

    if (!supabase) {
      return;
    }

    let ordersChannel;
    let driversChannel;

    try {
      ordersChannel = supabase
        .channel('dispatch-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            console.log('Order update detected, refreshing...');
            loadData();
          }
        )
        .subscribe();

      driversChannel = supabase
        .channel('dispatch-drivers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_statuses'
          },
          () => {
            console.log('Driver status update detected, refreshing...');
            loadData();
          }
        )
        .subscribe();
    } catch (error) {
      console.error('❌ Failed to initialize realtime subscriptions:', error);
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      if (ordersChannel) {
        ordersChannel.unsubscribe();
      }
      if (driversChannel) {
        driversChannel.unsubscribe();
      }
      clearInterval(interval);
    };
  }, [loadData, supabase]);

  const totalOnline = zones.reduce((sum, zone) => sum + zone.onlineDrivers.length, 0);
  const activeDeliveries = outstandingOrders.filter((order) => order.status === 'out_for_delivery').length;
  const pendingAssignments = outstandingOrders.filter((order) => order.status !== 'out_for_delivery').length;

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    haptic('soft');
  };

  const getOrdersByStatus = (status: OrderStatus): Order[] => {
    switch (status) {
      case 'pending':
        return outstandingOrders.filter(o => !o.assigned_driver && o.status !== 'delivered' && o.status !== 'cancelled');
      case 'assigned':
        return outstandingOrders.filter(o => o.assigned_driver && o.status === 'confirmed');
      case 'in_progress':
        return outstandingOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'preparing' || o.status === 'ready');
      case 'completed':
        return outstandingOrders.filter(o => o.status === 'delivered');
      default:
        return [];
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await dataStore.updateOrder?.(orderId, { assigned_driver: driverId });
      telegram.hapticFeedback('notification', 'success');
      Toast.success('הנהג שוייך בהצלחה');
      setSelectedOrder(null);
      setShowDriverSelector(false);
      await loadData();
    } catch (error) {
      console.error('Failed to assign driver:', error);
      Toast.error('שגיאה בשיוך נהג');
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
        <div style={{ color: colors.muted }}>טוען לוח תפעול...</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header with Real-Time Indicator */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: colors.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: colors.glowPrimaryStrong
            }}>
              📡
            </div>
            <div>
              <h1 style={{ ...styles.pageTitle, textAlign: 'right', marginBottom: '4px' }}>
                מוקד תפעול
              </h1>
              <p style={styles.pageSubtitle}>ניהול ושיוך בזמן אמת</p>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: `${colors.success}20`,
            borderRadius: '20px',
            border: `1px solid ${colors.success}50`
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.success,
              boxShadow: `0 0 8px ${colors.success}`,
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '12px', color: colors.success, fontWeight: '600' }}>זמן אמת</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => {
              setViewMode(viewMode === 'kanban' ? 'list' : 'kanban');
              telegram.hapticFeedback('selection');
            }}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
              color: colors.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {viewMode === 'kanban' ? '📋 רשימה' : '📊 קנבן'}
          </button>
          <button
            onClick={handleRefresh}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `2px solid ${colors.accent}`,
              borderRadius: '12px',
              color: colors.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '18px' }}>🔄</span>
            רענן
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: '14px',
            background: `${colors.error}15`,
            border: `1px solid ${colors.error}40`,
            color: colors.error,
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={styles.statBox}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚗</div>
          <div style={{ ...styles.statValue, fontSize: '28px', color: colors.success }}>{totalOnline}</div>
          <div style={styles.statLabel}>נהגים זמינים</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ ...styles.statValue, fontSize: '28px', color: colors.info }}>{zones.length}</div>
          <div style={styles.statLabel}>אזורי כיסוי</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚚</div>
          <div style={{ ...styles.statValue, fontSize: '28px', color: colors.accent }}>{activeDeliveries}</div>
          <div style={styles.statLabel}>במשלוח</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ ...styles.statValue, fontSize: '28px', color: colors.warning }}>{pendingAssignments}</div>
          <div style={styles.statLabel}>ממתינים</div>
        </div>
      </div>

      {/* Kanban Board or List View */}
      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Pending Column */}
          <div style={{
            ...styles.card,
            background: colors.gradientCard,
            minHeight: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>
                ⏳ ממתינים לשיוך
              </h3>
              <div style={{
                padding: '6px 12px',
                background: colors.gradientPrimary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: colors.textBright
              }}>
                {getOrdersByStatus('pending').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('pending').map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  colors={colors}
                  onAssign={() => {
                    setSelectedOrder(order);
                    setShowDriverSelector(true);
                  }}
                />
              ))}
              {getOrdersByStatus('pending').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>✅</div>
                  <div style={{ fontSize: '14px' }}>אין הזמנות ממתינות</div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Column */}
          <div style={{
            ...styles.card,
            background: colors.gradientCard,
            minHeight: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>
                📄 משוייכים
              </h3>
              <div style={{
                padding: '6px 12px',
                background: colors.gradientPrimary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: colors.textBright
              }}>
                {getOrdersByStatus('assigned').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('assigned').map(order => (
                <OrderCard key={order.id} order={order} colors={colors} />
              ))}
              {getOrdersByStatus('assigned').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📎</div>
                  <div style={{ fontSize: '14px' }}>אין הזמנות משוייכות</div>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div style={{
            ...styles.card,
            background: colors.gradientCard,
            minHeight: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>
                🚚 בתהליך
              </h3>
              <div style={{
                padding: '6px 12px',
                background: colors.gradientPrimary,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: colors.textBright
              }}>
                {getOrdersByStatus('in_progress').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('in_progress').map(order => (
                <OrderCard key={order.id} order={order} colors={colors} />
              ))}
              {getOrdersByStatus('in_progress').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🚦</div>
                  <div style={{ fontSize: '14px' }}>אין משלוחים בתהליך</div>
                </div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div style={{
            ...styles.card,
            background: colors.gradientCard,
            minHeight: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: colors.text }}>
                ✅ הושלמו
              </h3>
              <div style={{
                padding: '6px 12px',
                background: colors.gradientSuccess,
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                color: colors.textBright
              }}>
                {getOrdersByStatus('completed').length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getOrdersByStatus('completed').slice(0, 5).map(order => (
                <OrderCard key={order.id} order={order} colors={colors} />
              ))}
              {getOrdersByStatus('completed').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
                  <div style={{ fontSize: '14px' }}>אין הזמנות שהושלמו</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {outstandingOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              colors={colors}
              onAssign={!order.assigned_driver ? () => {
                setSelectedOrder(order);
                setShowDriverSelector(true);
              } : undefined}
            />
          ))}
        </div>
      )}

      {/* Driver Availability Sidebar */}
      {showDriverSelector && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            ...styles.card,
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: colors.text }}>
                שיוך נהג להזמנה
              </h3>
              <button
                onClick={() => {
                  setShowDriverSelector(false);
                  setSelectedOrder(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.muted,
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Order Info */}
            <div style={{
              padding: '16px',
              background: colors.secondary,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
                {selectedOrder.customer_name}
              </div>
              <div style={{ fontSize: '14px', color: colors.muted }}>
                📍 {selectedOrder.customer_address}
              </div>
            </div>

            {/* Available Drivers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').map(driver => (
                <button
                  key={driver.driver_id}
                  onClick={() => handleAssignDriver(selectedOrder.id, driver.driver_id)}
                  style={{
                    padding: '16px',
                    background: colors.secondary,
                    border: `2px solid ${colors.cardBorder}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'right'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `2px solid ${colors.accent}`;
                    e.currentTarget.style.background = `${colors.accent}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = `2px solid ${colors.cardBorder}`;
                    e.currentTarget.style.background = colors.secondary;
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
                    נהג #{driver.driver_id}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.success }}>
                    ✅ זמין
                  </div>
                </button>
              ))}
              {zones.flatMap(z => z.onlineDrivers).filter(d => d.status === 'available').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚫</div>
                  <div>אין נהגים זמינים כרגע</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Card Component
function OrderCard({ order, colors, onAssign }: {
  order: Order;
  colors: any;
  onAssign?: () => void;
}) {
  return (
    <div style={{
      padding: '16px',
      background: colors.secondary,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '12px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
            {order.customer_name}
          </div>
          <div style={{ fontSize: '13px', color: colors.muted, marginBottom: '8px' }}>
            📍 {order.customer_address}
          </div>
          <div style={{ fontSize: '13px', color: colors.muted }}>
            📞 {order.customer_phone}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: `${colors.accent}20`,
          border: `1px solid ${colors.accent}50`,
          borderRadius: '8px',
          color: colors.accent,
          fontSize: '12px',
          fontWeight: '600'
        }}>
          ₪{order.total_amount.toLocaleString()}
        </div>
      </div>

      {order.assigned_driver && (
        <div style={{
          padding: '8px 12px',
          background: `${colors.success}15`,
          borderRadius: '8px',
          fontSize: '13px',
          color: colors.success,
          marginBottom: '12px'
        }}>
          🚗 נהג: {order.assigned_driver}
        </div>
      )}

      {onAssign && (
        <button
          onClick={onAssign}
          style={{
            width: '100%',
            padding: '12px',
            background: colors.gradientPrimary,
            border: 'none',
            borderRadius: '10px',
            color: colors.textBright,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: colors.glowPrimary
          }}
        >
          שייך נהג
        </button>
      )}
    </div>
  );
}
