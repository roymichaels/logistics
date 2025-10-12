import React, { useEffect, useState, useCallback } from 'react';
import { DataStore, User, Order } from '../data/types';
import { DriverService, DriverStats, OrderAssignment } from '../lib/driverService';
import { DriverAssignmentModal, AssignmentDetails } from '../components/DriverAssignmentModal';
import { getStatusBadgeStyle } from '../styles/royalTheme';
import { Toast } from '../components/Toast';
import { telegram } from '../lib/telegram';
import { useRoleTheme } from '../hooks/useRoleTheme';

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
  const [earningsView, setEarningsView] = useState<'today' | 'week' | 'month'>('today');
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const driverService = new DriverService(dataStore);
  const supabase = (dataStore as any).supabase;

  const theme = telegram.themeParams;
  const { colors, styles } = useRoleTheme();

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

    // Verify supabase is available before setting up subscriptions
    let subscription;

    if (supabase) {
      try {
        subscription = supabase
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
      } catch (error) {
        console.error('❌ Failed to initialize realtime subscriptions:', error);
      }
    } else {
      console.warn('⚠️ Supabase instance not available for realtime subscriptions');
    }

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
            setLastLocationUpdate(new Date());
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
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }

    return () => {
      clearInterval(interval);
      if (subscription) {
        subscription.unsubscribe();
      }
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

  const getEarningsData = () => {
    if (!stats) return { amount: 0, label: 'היום' };

    switch (earningsView) {
      case 'week':
        return { amount: stats.revenue_today * 7, label: 'השבוע' }; // Simplified - should use actual weekly data
      case 'month':
        return { amount: stats.revenue_today * 30, label: 'החודש' }; // Simplified - should use actual monthly data
      default:
        return { amount: stats.revenue_today, label: 'היום' };
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
        <div style={{ color: colors.muted }}>טוען לוח בקרה...</div>
      </div>
    );
  }

  if (!user || user.role !== 'driver') {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <div style={{ color: colors.error }}>אין גישה - נהגים בלבד</div>
      </div>
    );
  }

  const earnings = getEarningsData();

  return (
    <div style={styles.pageContainer}>
      {/* Header with Greeting */}
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
              🚗
            </div>
            <div>
              <h1 style={{ ...styles.pageTitle, textAlign: 'right', marginBottom: '4px' }}>
                שלום, {user.name || 'נהג'}!
              </h1>
              <p style={styles.pageSubtitle}>מוכן למשלוח הבא?</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: `2px solid ${colors.accent}`,
            borderRadius: '12px',
            color: colors.accent,
            fontSize: '14px',
            fontWeight: '600',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.5 : 1,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '18px' }}>{refreshing ? '⟳' : '🔄'}</span>
          רענן
        </button>
      </div>

      {/* Online Status Card - Large Touch-Friendly Toggle */}
      <div
        style={{
          ...styles.card,
          marginBottom: '24px',
          background: isOnline ? colors.gradientSuccess : colors.gradientCard,
          border: isOnline ? `2px solid ${colors.success}` : `2px solid ${colors.cardBorder}`,
          boxShadow: isOnline ? '0 0 30px rgba(16, 185, 129, 0.4)' : colors.shadow,
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.textBright, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{isOnline ? '🟢' : '⚫'}</span>
              {isOnline ? 'מקוון - זמין להזמנות' : 'לא מקוון'}
            </div>
            <div style={{ fontSize: '15px', color: isOnline ? 'rgba(255, 255, 255, 0.9)' : colors.mutedDark }}>
              {isOnline ? 'תקבל התראות על הזמנות חדשות' : 'לא תקבל הזמנות חדשות'}
            </div>
            {isOnline && lastLocationUpdate && (
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
                📍 עדכון מיקום אחרון: {new Date(lastLocationUpdate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <button
            onClick={handleToggleOnline}
            style={{
              padding: '16px 28px',
              background: isOnline ? colors.gradientCrimson : colors.gradientPrimary,
              border: 'none',
              borderRadius: '16px',
              color: colors.textBright,
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: isOnline ? '0 8px 20px rgba(255, 107, 138, 0.4)' : colors.glowPrimaryStrong,
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            {isOnline ? 'סגור' : 'פתוח'}
          </button>
        </div>
      </div>

      {/* Earnings Card with Tabs */}
      {stats && (
        <div style={{ ...styles.card, marginBottom: '24px', background: colors.gradientCard }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: colors.text }}>
              💰 הכנסות
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['today', 'week', 'month'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    setEarningsView(view);
                    telegram.hapticFeedback('selection');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: earningsView === view ? colors.gradientPrimary : 'transparent',
                    border: `1px solid ${earningsView === view ? 'transparent' : colors.cardBorder}`,
                    borderRadius: '10px',
                    color: earningsView === view ? colors.textBright : colors.muted,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {view === 'today' ? 'היום' : view === 'week' ? 'שבוע' : 'חודש'}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            padding: '32px',
            background: `linear-gradient(135deg, ${colors.accent}15, ${colors.secondary})`,
            borderRadius: '16px',
            border: `1px solid ${colors.cardBorder}`,
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '700', color: colors.gold, marginBottom: '8px', textShadow: colors.glowGold }}>
              ₪{earnings.amount.toLocaleString()}
            </div>
            <div style={{ fontSize: '16px', color: colors.muted, fontWeight: '500' }}>
              הכנסות {earnings.label}
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: colors.secondary, borderRadius: '12px' }}>
              <span style={{ color: colors.muted, fontSize: '14px' }}>💵 משכורת בסיס</span>
              <span style={{ color: colors.text, fontSize: '14px', fontWeight: '600' }}>₪{(earnings.amount * 0.7).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: colors.secondary, borderRadius: '12px' }}>
              <span style={{ color: colors.muted, fontSize: '14px' }}>✨ טיפים</span>
              <span style={{ color: colors.success, fontSize: '14px', fontWeight: '600' }}>+₪{(earnings.amount * 0.2).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: colors.secondary, borderRadius: '12px' }}>
              <span style={{ color: colors.muted, fontSize: '14px' }}>🎯 בונוסים</span>
              <span style={{ color: colors.gold, fontSize: '14px', fontWeight: '600' }}>+₪{(earnings.amount * 0.1).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Stats Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={styles.statBox}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
            <div style={{ ...styles.statValue, fontSize: '28px' }}>{stats.active_orders}</div>
            <div style={styles.statLabel}>פעילות</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <div style={{ ...styles.statValue, color: colors.success, fontSize: '28px' }}>
              {stats.completed_today}
            </div>
            <div style={styles.statLabel}>הושלמו היום</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
            <div style={{ ...styles.statValue, color: colors.gold, fontSize: '28px' }}>
              {stats.rating.toFixed(1)}
            </div>
            <div style={styles.statLabel}>דירוג</div>
          </div>
          <div style={styles.statBox}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏱️</div>
            <div style={{ ...styles.statValue, color: colors.info, fontSize: '28px' }}>
              {Math.floor((stats.completed_today || 0) * 35)}m
            </div>
            <div style={styles.statLabel}>שעות פעילות</div>
          </div>
        </div>
      )}

      {/* Active Orders Section */}
      <div style={{ ...styles.card, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: colors.text }}>
            🚚 הזמנות פעילות
          </h2>
          <div style={{
            padding: '8px 16px',
            background: activeOrders.length > 0 ? colors.gradientPrimary : colors.secondary,
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            color: colors.textBright,
            boxShadow: activeOrders.length > 0 ? colors.glowPrimary : 'none'
          }}>
            {activeOrders.length}
          </div>
        </div>

        {activeOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
            <div style={{ fontSize: '18px', color: colors.text, fontWeight: '600', marginBottom: '8px' }}>
              {isOnline ? 'אין הזמנות כרגע' : 'אתה לא מקוון'}
            </div>
            <div style={{ fontSize: '14px', color: colors.muted }}>
              {isOnline ? 'ההזמנה הבאה תופיע כאן בקרוב' : 'עבור למצב מקוון כדי לקבל הזמנות'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeOrders.map((order, index) => (
              <div
                key={order.id}
                style={{
                  padding: '20px',
                  background: colors.secondary,
                  border: `2px solid ${colors.cardBorder}`,
                  borderRadius: '18px',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Order Sequence Number */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: colors.gradientPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: colors.textBright,
                  boxShadow: colors.glowPrimary
                }}>
                  {index + 1}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingLeft: '50px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                      {order.customer_name}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📞 {order.customer_phone}
                    </div>
                  </div>
                  <div style={getStatusBadgeStyle(order.status)}>
                    {order.status}
                  </div>
                </div>

                <div style={{ fontSize: '15px', color: colors.text, marginBottom: '16px', display: 'flex', gap: '8px', padding: '12px', background: `${colors.accent}10`, borderRadius: '12px', border: `1px solid ${colors.accent}30` }}>
                  <span style={{ fontSize: '18px' }}>📍</span>
                  <span>{order.customer_address}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '8px 14px',
                    background: `${colors.info}20`,
                    border: `1px solid ${colors.info}50`,
                    borderRadius: '10px',
                    color: colors.info,
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📦 {order.items.length} פריטים
                  </div>
                  <div style={{
                    padding: '8px 14px',
                    background: `${colors.gold}20`,
                    border: `1px solid ${colors.gold}50`,
                    borderRadius: '10px',
                    color: colors.gold,
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    💰 ₪{order.total_amount.toLocaleString()}
                  </div>
                </div>

                {/* Large Touch-Friendly Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {order.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        style={{
                          padding: '16px 20px',
                          background: colors.gradientPrimary,
                          border: 'none',
                          borderRadius: '14px',
                          color: colors.textBright,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: colors.glowPrimaryStrong,
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        ▶️ התחל הכנה
                      </button>
                      <button
                        onClick={() => {
                          const phone = order.customer_phone.replace(/[^0-9]/g, '');
                          window.open(`tel:${phone}`, '_self');
                        }}
                        style={{
                          padding: '16px 20px',
                          background: 'transparent',
                          border: `2px solid ${colors.accent}`,
                          borderRadius: '14px',
                          color: colors.accent,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        📞 התקשר
                      </button>
                    </>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                      style={{
                        padding: '16px 20px',
                        background: colors.gradientSuccess,
                        border: 'none',
                        borderRadius: '14px',
                        color: colors.textBright,
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.3s ease',
                        gridColumn: '1 / -1'
                      }}
                    >
                      ✅ מוכן לאיסוף
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                        style={{
                          padding: '16px 20px',
                          background: colors.gradientPrimary,
                          border: 'none',
                          borderRadius: '14px',
                          color: colors.textBright,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: colors.glowPrimaryStrong,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        🚗 יציאה
                      </button>
                      <button
                        onClick={() => {
                          const address = encodeURIComponent(order.customer_address);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                        }}
                        style={{
                          padding: '16px 20px',
                          background: 'transparent',
                          border: `2px solid ${colors.info}`,
                          borderRadius: '14px',
                          color: colors.info,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        🗺️ ניווט
                      </button>
                    </>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                      style={{
                        padding: '18px 24px',
                        background: colors.gradientSuccess,
                        border: 'none',
                        borderRadius: '14px',
                        color: colors.textBright,
                        fontSize: '18px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.5)',
                        transition: 'all 0.3s ease',
                        gridColumn: '1 / -1'
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
