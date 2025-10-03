import React, { useEffect, useState, useCallback } from 'react';
import { DataStore, User, Order } from '../data/types';
import { DriverService, DriverStats, OrderAssignment } from '../src/lib/driverService';
import { DriverAssignmentModal, AssignmentDetails } from '../src/components/DriverAssignmentModal';
import { ROYAL_COLORS, ROYAL_STYLES, getStatusBadgeStyle } from '../src/styles/royalTheme';
import { Toast } from '../src/components/Toast';
import { telegram } from '../lib/telegram';

interface DriverDashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function DriverDashboard({ dataStore }: DriverDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [pendingAssignment, setPendingAssignment] = useState<AssignmentDetails | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const driverService = new DriverService(dataStore);
  const supabase = (dataStore as any).supabase;

  const theme = telegram.themeParams;

  const loadDriverData = useCallback(async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      if (profile.role !== 'driver') {
        Toast.error('דף זה זמין לנהגים בלבד');
        return;
      }

      const [driverStats, orders, driverProfile] = await Promise.all([
        driverService.getDriverStats(profile.telegram_id),
        dataStore.listOrders?.({}) || Promise.resolve([]),
        driverService.getDriverProfile(profile.telegram_id)
      ]);

      setStats(driverStats);
      setIsOnline(driverProfile?.is_available || false);

      const myOrders = orders.filter(
        (o) =>
          o.assigned_driver === profile.telegram_id &&
          !['delivered', 'cancelled'].includes(o.status)
      );
      setActiveOrders(myOrders);

      const assignments = await driverService.getDriverAssignments(profile.telegram_id, 'pending');
      if (assignments.length > 0) {
        const latestAssignment = assignments[0];
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', latestAssignment.order_id)
          .single();

        if (orderData && new Date(latestAssignment.timeout_at) > new Date()) {
          setPendingAssignment({
            assignment_id: latestAssignment.id,
            order: orderData,
            timeout_at: latestAssignment.timeout_at,
            assigned_by: latestAssignment.assigned_by
          });
        }
      }
    } catch (error) {
      console.error('Failed to load driver data:', error);
      Toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dataStore, driverService, supabase]);

  useEffect(() => {
    loadDriverData();

    const interval = setInterval(() => {
      loadDriverData();
    }, 30000);

    const subscription = supabase
      .channel('driver-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_assignments',
          filter: `driver_id=eq.${user?.telegram_id}`
        },
        () => {
          telegram.hapticFeedback('notification', 'success');
          loadDriverData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          loadDriverData();
        }
      )
      .subscribe();

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          if (user && isOnline) {
            await driverService.updateDriverLocation(
              user.telegram_id,
              position.coords.latitude,
              position.coords.longitude,
              {
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined
              }
            );
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(interval);
        subscription.unsubscribe();
      };
    }

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [loadDriverData, user, isOnline, driverService, supabase]);

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      await driverService.respondToAssignment(assignmentId, 'accepted');
      setPendingAssignment(null);
      await loadDriverData();
    } catch (error) {
      console.error('Failed to accept assignment:', error);
      throw error;
    }
  };

  const handleDeclineAssignment = async (assignmentId: string, reason?: string) => {
    try {
      await driverService.respondToAssignment(assignmentId, 'declined', reason);
      setPendingAssignment(null);
      await loadDriverData();
    } catch (error) {
      console.error('Failed to decline assignment:', error);
      throw error;
    }
  };

  const handleToggleOnline = async () => {
    if (!user) return;

    try {
      const newStatus = !isOnline;
      await driverService.setDriverAvailability(user.telegram_id, newStatus);
      setIsOnline(newStatus);
      telegram.hapticFeedback('selection');
      Toast.success(newStatus ? 'עברת למצב מקוון' : 'עברת למצב לא מקוון');
    } catch (error) {
      console.error('Failed to toggle online status:', error);
      Toast.error('שגיאה בשינוי סטטוס');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    telegram.hapticFeedback('soft');
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await dataStore.updateOrder?.(orderId, { status: newStatus });
      telegram.hapticFeedback('notification', 'success');
      Toast.success('סטטוס הזמנה עודכן');
      await loadDriverData();
    } catch (error) {
      console.error('Failed to update order status:', error);
      Toast.error('שגיאה בעדכון סטטוס');
    }
  };

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <div style={{ color: ROYAL_COLORS.muted }}>טוען לוח בקרה...</div>
      </div>
    );
  }

  if (!user || user.role !== 'driver') {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <div style={{ color: ROYAL_COLORS.error }}>אין גישה - נהגים בלבד</div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={{ ...ROYAL_STYLES.pageHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ ...ROYAL_STYLES.pageTitle, marginBottom: '4px' }}>שלום, {user.name || 'נהג'}</h1>
          <p style={ROYAL_STYLES.pageSubtitle}>לוח הבקרה שלך</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            padding: '10px 20px',
            opacity: refreshing ? 0.5 : 1
          }}
        >
          {refreshing ? '⟳' : '🔄'} רענן
        </button>
      </div>

      <div
        style={{
          ...ROYAL_STYLES.card,
          marginBottom: '24px',
          background: isOnline ? ROYAL_COLORS.gradientSuccess : ROYAL_COLORS.gradientCard,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.textBright, marginBottom: '8px' }}>
            {isOnline ? '🟢 מקוון - זמין להזמנות' : '⚫ לא מקוון'}
          </div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.mutedDark }}>
            {isOnline ? 'תקבל התראות על הזמנות חדשות' : 'לא תקבל הזמנות חדשות'}
          </div>
        </div>
        <button
          onClick={handleToggleOnline}
          style={{
            ...ROYAL_STYLES.buttonPrimary,
            background: isOnline ? ROYAL_COLORS.gradientCrimson : ROYAL_COLORS.gradientPurple,
            minWidth: '120px'
          }}
        >
          {isOnline ? 'עבור לא מקוון' : 'עבור מקוון'}
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={ROYAL_STYLES.statBox}>
            <div style={ROYAL_STYLES.statValue}>{stats.active_orders}</div>
            <div style={ROYAL_STYLES.statLabel}>הזמנות פעילות</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.success }}>
              {stats.completed_today}
            </div>
            <div style={ROYAL_STYLES.statLabel}>בוצעו היום</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>
              {stats.rating.toFixed(1)} ⭐
            </div>
            <div style={ROYAL_STYLES.statLabel}>דירוג</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.info }}>
              ₪{stats.revenue_today.toLocaleString()}
            </div>
            <div style={ROYAL_STYLES.statLabel}>הכנסות היום</div>
          </div>
        </div>
      )}

      <div style={{ ...ROYAL_STYLES.card, marginBottom: '24px' }}>
        <h2 style={ROYAL_STYLES.cardTitle}>הזמנות פעילות ({activeOrders.length})</h2>

        {activeOrders.length === 0 ? (
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
            <div style={ROYAL_STYLES.emptyStateText}>
              {isOnline ? 'אין לך הזמנות פעילות כרגע' : 'עבור למקוון כדי לקבל הזמנות'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  padding: '20px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                      {order.customer_name}
                    </div>
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                      {order.customer_phone}
                    </div>
                  </div>
                  <div style={getStatusBadgeStyle(order.status)}>
                    {order.status}
                  </div>
                </div>

                <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <span>📍</span>
                  <span>{order.customer_address}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ ...ROYAL_STYLES.badge, ...ROYAL_STYLES.badgeInfo }}>
                    {order.items.length} פריטים
                  </div>
                  <div style={{ ...ROYAL_STYLES.badge, background: `${ROYAL_COLORS.gold}20`, color: ROYAL_COLORS.gold, border: `1px solid ${ROYAL_COLORS.gold}50` }}>
                    ₪{order.total_amount.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                      style={{
                        ...ROYAL_STYLES.buttonPrimary,
                        flex: 1,
                        minWidth: '140px',
                        padding: '10px'
                      }}
                    >
                      התחל הכנה
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                      style={{
                        ...ROYAL_STYLES.buttonSuccess,
                        flex: 1,
                        minWidth: '140px',
                        padding: '10px'
                      }}
                    >
                      מוכן לאיסוף
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                      style={{
                        ...ROYAL_STYLES.buttonPrimary,
                        flex: 1,
                        minWidth: '140px',
                        padding: '10px'
                      }}
                    >
                      🚗 יציאה למשלוח
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                      style={{
                        ...ROYAL_STYLES.buttonSuccess,
                        flex: 1,
                        minWidth: '140px',
                        padding: '10px'
                      }}
                    >
                      ✅ סמן כנמסר
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingAssignment && (
        <DriverAssignmentModal
          assignment={pendingAssignment}
          onAccept={handleAcceptAssignment}
          onDecline={handleDeclineAssignment}
          onClose={() => setPendingAssignment(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
