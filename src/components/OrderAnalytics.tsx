import React, { useEffect, useState, useMemo } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface OrderAnalyticsProps {
  supabase: any;
  userRole: string;
}

interface AnalyticsData {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgDeliveryTime: number;
  topDrivers: Array<{
    driver_id: string;
    driver_name: string;
    deliveries: number;
    rating: number;
  }>;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  ordersPerHour: Array<{ hour: number; count: number }>;
}

export function OrderAnalytics({ supabase, userRole }: OrderAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, supabase]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: driverProfiles } = await supabase
        .from('driver_profiles')
        .select('*, users!driver_profiles_user_id_fkey(name)');

      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter((o: any) => o.status === 'delivered').length || 0;
      const cancelledOrders = orders?.filter((o: any) => o.status === 'cancelled').length || 0;
      const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const deliveredOrders = orders?.filter((o: any) => o.status === 'delivered' && o.delivered_at && o.created_at) || [];
      const avgDeliveryTime =
        deliveredOrders.length > 0
          ? deliveredOrders.reduce((sum: number, o: any) => {
              const created = new Date(o.created_at).getTime();
              const delivered = new Date(o.delivered_at).getTime();
              return sum + (delivered - created) / (1000 * 60);
            }, 0) / deliveredOrders.length
          : 0;

      const driverStats = new Map<string, { deliveries: number; profile: any }>();
      orders?.forEach((order: any) => {
        if (order.status === 'delivered' && order.assigned_driver) {
          const current = driverStats.get(order.assigned_driver) || { deliveries: 0, profile: null };
          current.deliveries++;
          if (!current.profile) {
            current.profile = driverProfiles?.find((p: any) => p.user_id === order.assigned_driver);
          }
          driverStats.set(order.assigned_driver, current);
        }
      });

      const topDrivers = Array.from(driverStats.entries())
        .map(([driver_id, data]) => ({
          driver_id,
          driver_name: data.profile?.users?.name || `Driver ${driver_id.slice(0, 8)}`,
          deliveries: data.deliveries,
          rating: data.profile?.rating || 0
        }))
        .sort((a, b) => b.deliveries - a.deliveries)
        .slice(0, 5);

      const ordersByStatus: Record<string, number> = {};
      orders?.forEach((order: any) => {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      });

      const revenueByDay = new Map<string, number>();
      orders?.forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString('he-IL');
        revenueByDay.set(date, (revenueByDay.get(date) || 0) + (order.total_amount || 0));
      });

      const ordersPerHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: orders?.filter((o: any) => new Date(o.created_at).getHours() === hour).length || 0
      }));

      setData({
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        avgOrderValue,
        avgDeliveryTime,
        topDrivers,
        ordersByStatus,
        revenueByDay: Array.from(revenueByDay.entries()).map(([date, revenue]) => ({ date, revenue })),
        ordersPerHour
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = data ? (data.completedOrders / Math.max(1, data.totalOrders)) * 100 : 0;
  const cancellationRate = data ? (data.cancelledOrders / Math.max(1, data.totalOrders)) * 100 : 0;

  if (!['owner', 'manager', 'dispatcher'].includes(userRole)) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <div style={{ color: ROYAL_COLORS.error }}>אין הרשאה לצפות בנתונים אלו</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div style={{ color: ROYAL_COLORS.muted }}>טוען אנליטיקה...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <div style={{ color: ROYAL_COLORS.error }}>שגיאה בטעינת נתונים</div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={{ ...ROYAL_STYLES.pageHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={ROYAL_STYLES.pageTitle}>אנליטיקת הזמנות</h1>
          <p style={ROYAL_STYLES.pageSubtitle}>מבט מקיף על ביצועי המערכת</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          style={{
            ...ROYAL_STYLES.input,
            width: 'auto',
            padding: '10px 16px'
          }}
        >
          <option value="today">היום</option>
          <option value="week">שבוע אחרון</option>
          <option value="month">חודש אחרון</option>
          <option value="all">כל הזמן</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>{data.totalOrders}</div>
          <div style={ROYAL_STYLES.statLabel}>סך הזמנות</div>
        </div>

        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.success }}>
            {data.completedOrders}
          </div>
          <div style={ROYAL_STYLES.statLabel}>הושלמו</div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '4px' }}>
            {completionRate.toFixed(1)}%
          </div>
        </div>

        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.error }}>
            {data.cancelledOrders}
          </div>
          <div style={ROYAL_STYLES.statLabel}>בוטלו</div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '4px' }}>
            {cancellationRate.toFixed(1)}%
          </div>
        </div>

        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>
            ₪{data.totalRevenue.toLocaleString()}
          </div>
          <div style={ROYAL_STYLES.statLabel}>סך הכנסות</div>
        </div>

        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.info }}>
            ₪{data.avgOrderValue.toFixed(0)}
          </div>
          <div style={ROYAL_STYLES.statLabel}>ממוצע הזמנה</div>
        </div>

        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.accentBright }}>
            {data.avgDeliveryTime.toFixed(0)}<span style={{ fontSize: '16px' }}>m</span>
          </div>
          <div style={ROYAL_STYLES.statLabel}>זמן משלוח ממוצע</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={ROYAL_STYLES.card}>
          <h2 style={ROYAL_STYLES.cardTitle}>הזמנות לפי סטטוס</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(data.ordersByStatus).map(([status, count]) => {
              const percentage = (count / data.totalOrders) * 100;
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>{status}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: ROYAL_COLORS.secondary,
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: ROYAL_COLORS.gradientPurple,
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={ROYAL_STYLES.card}>
          <h2 style={ROYAL_STYLES.cardTitle}>נהגים מובילים</h2>
          {data.topDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', color: ROYAL_COLORS.muted, padding: '20px' }}>
              אין נתונים זמינים
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.topDrivers.map((driver, index) => (
                <div
                  key={driver.driver_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px',
                    background: ROYAL_COLORS.secondary,
                    borderRadius: '12px',
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: ROYAL_COLORS.gradientPurple,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: ROYAL_COLORS.textBright
                    }}
                  >
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: ROYAL_COLORS.text }}>
                      {driver.driver_name}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      {driver.deliveries} משלוחים • ⭐ {driver.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={ROYAL_STYLES.card}>
        <h2 style={ROYAL_STYLES.cardTitle}>הזמנות לפי שעה ביום</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '20px 0' }}>
          {data.ordersPerHour.map((item) => {
            const maxCount = Math.max(...data.ordersPerHour.map((o) => o.count));
            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div
                key={item.hour}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}%`,
                    minHeight: item.count > 0 ? '4px' : '0',
                    background: ROYAL_COLORS.gradientPurple,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  title={`${item.hour}:00 - ${item.count} הזמנות`}
                />
                <div style={{ fontSize: '10px', color: ROYAL_COLORS.muted }}>
                  {item.hour}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
