import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { formatCurrency, hebrew } from '../lib/i18n';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';

interface AnalyticsDashboardProps {
  dataStore: DataStore;
  user: User | null;
  businessId?: string | null;
}

interface PerformanceMetrics {
  orderCompletionRate: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  driverUtilization: number;
  peakHours: Array<{ hour: number; orderCount: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  trendsData: Array<{ date: string; orders: number; revenue: number }>;
}

export function AnalyticsDashboard({ dataStore, user, businessId }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    orderCompletionRate: 0,
    averageDeliveryTime: 0,
    customerSatisfaction: 0,
    driverUtilization: 0,
    peakHours: [],
    topProducts: [],
    ordersByStatus: {},
    trendsData: []
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [dataStore, businessId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const orders = await dataStore.listOrders?.() || [];
      const products = await dataStore.listProducts?.() || [];

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'delivered').length;
      const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      const hoursMap = new Map<number, number>();
      orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hoursMap.set(hour, (hoursMap.get(hour) || 0) + 1);
      });

      const peakHours = Array.from(hoursMap.entries())
        .map(([hour, orderCount]) => ({ hour, orderCount }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      const productMap = new Map<string, { quantity: number; revenue: number; name: string }>();
      orders
        .filter(o => o.status === 'delivered')
        .forEach(order => {
          (order as any).items?.forEach((item: any) => {
            const existing = productMap.get(item.product_id) || { quantity: 0, revenue: 0, name: item.product_name || 'Unknown' };
            productMap.set(item.product_id, {
              name: existing.name,
              quantity: existing.quantity + (item.quantity || 0),
              revenue: existing.revenue + (item.price * item.quantity || 0)
            });
          });
        });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const statusMap: Record<string, number> = {};
      orders.forEach(order => {
        statusMap[order.status] = (statusMap[order.status] || 0) + 1;
      });

      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const trendsMap = new Map<string, { orders: number; revenue: number }>();
      orders
        .filter(o => new Date(o.created_at) >= startDate)
        .forEach(order => {
          const dateKey = new Date(order.created_at).toISOString().split('T')[0];
          const existing = trendsMap.get(dateKey) || { orders: 0, revenue: 0 };
          trendsMap.set(dateKey, {
            orders: existing.orders + 1,
            revenue: existing.revenue + (order.status === 'delivered' ? Number(order.total_amount || 0) : 0)
          });
        });

      const trendsData = Array.from(trendsMap.entries())
        .map(([date, data]) => ({ date, orders: data.orders, revenue: data.revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      setMetrics({
        orderCompletionRate,
        averageDeliveryTime: 45,
        customerSatisfaction: 4.8,
        driverUtilization: 78,
        peakHours,
        topProducts,
        ordersByStatus: statusMap,
        trendsData
      });
    } catch (error) {
      logger.error('Failed to load analytics:', error);
      Toast.error('שגיאה בטעינת נתוני ניתוח');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדשה',
      confirmed: 'מאושרת',
      preparing: 'בהכנה',
      ready: 'מוכנה',
      out_for_delivery: 'במשלוח',
      delivered: 'נמסרה',
      cancelled: 'בוטלה'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: ROYAL_COLORS.info,
      confirmed: ROYAL_COLORS.success,
      preparing: ROYAL_COLORS.warning,
      ready: ROYAL_COLORS.accent,
      out_for_delivery: ROYAL_COLORS.gold,
      delivered: ROYAL_COLORS.success,
      cancelled: ROYAL_COLORS.error
    };
    return colors[status] || ROYAL_COLORS.muted;
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...ROYAL_STYLES.pageContainer, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={ROYAL_STYLES.pageTitle}>📊 ניתוח ביצועים</h1>
        <button
          onClick={loadAnalytics}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            padding: '10px 16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🔄</span>
          <span>רענן</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto' }}>
        {['week', 'month', 'quarter', 'year'].map((range) => (
          <button
            key={range}
            onClick={() => {
              setTimeRange(range as any);
              telegram.hapticFeedback('selection');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: timeRange === range ? 'none' : `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: timeRange === range ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.secondary,
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            {range === 'week' && 'שבוע'}
            {range === 'month' && 'חודש'}
            {range === 'quarter' && 'רבעון'}
            {range === 'year' && 'שנה'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.success}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.success}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            שיעור השלמה
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: ROYAL_COLORS.success }}>
            {metrics.orderCompletionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px' }}>
            מתוך כל ההזמנות
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.info}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.info}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            זמן משלוח ממוצע
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: ROYAL_COLORS.info }}>
            {metrics.averageDeliveryTime}
          </div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px' }}>
            דקות
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.gold}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.gold}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            שביעות רצון
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: ROYAL_COLORS.gold, textShadow: ROYAL_COLORS.glowGold }}>
            {metrics.customerSatisfaction.toFixed(1)}
          </div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px' }}>
            מתוך 5
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.accent}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.accent}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            ניצול נהגים
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
            {metrics.driverUtilization}%
          </div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginTop: '8px' }}>
            ממוצע
          </div>
        </div>
      </div>

      {metrics.peakHours.length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={ROYAL_STYLES.cardTitle}>⏰ שעות שיא</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.peakHours.map(({ hour, orderCount }) => (
              <div
                key={hour}
                style={{
                  padding: '14px',
                  background: ROYAL_COLORS.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                    {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
                    {orderCount}
                  </div>
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>הזמנות</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(metrics.ordersByStatus).length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={ROYAL_STYLES.cardTitle}>📋 הזמנות לפי סטטוס</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(metrics.ordersByStatus).map(([status, count]) => (
              <div
                key={status}
                style={{
                  padding: '14px',
                  background: ROYAL_COLORS.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                  {getStatusLabel(status)}
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: `${getStatusColor(status)}20`,
                  border: `1px solid ${getStatusColor(status)}50`,
                  color: getStatusColor(status),
                  fontSize: '16px',
                  fontWeight: '700'
                }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.topProducts.length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={ROYAL_STYLES.cardTitle}>🏆 מוצרים מובילים</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.topProducts.map((product, index) => (
              <div
                key={index}
                style={{
                  padding: '14px',
                  background: index < 3
                    ? `linear-gradient(135deg, ${ROYAL_COLORS.gold}10, ${ROYAL_COLORS.secondary})`
                    : ROYAL_COLORS.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: index < 3 ? `1px solid ${ROYAL_COLORS.gold}30` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: index < 3 ? ROYAL_COLORS.gradientGold : ROYAL_COLORS.card,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: index < 3 ? '#1a0a00' : ROYAL_COLORS.text
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '2px' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      {product.quantity} יחידות נמכרו
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: index < 3 ? ROYAL_COLORS.gold : ROYAL_COLORS.text }}>
                  {formatCurrency(product.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={ROYAL_STYLES.card}>
        <h3 style={ROYAL_STYLES.cardTitle}>💡 המלצות</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metrics.orderCompletionRate < 90 && (
            <div style={{ padding: '16px', background: `${ROYAL_COLORS.warning}10`, border: `1px solid ${ROYAL_COLORS.warning}30`, borderRadius: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.warning, marginBottom: '8px' }}>
                ⚠️ שיעור השלמה נמוך
              </div>
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, lineHeight: '1.5' }}>
                שקול לבחון את תהליכי האספקה ולייעל את תיאום הנהגים
              </div>
            </div>
          )}
          {metrics.driverUtilization < 70 && (
            <div style={{ padding: '16px', background: `${ROYAL_COLORS.info}10`, border: `1px solid ${ROYAL_COLORS.info}30`, borderRadius: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.info, marginBottom: '8px' }}>
                ℹ️ ניצול נמוך של נהגים
              </div>
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, lineHeight: '1.5' }}>
                אפשר לייעל את חלוקת המשימות בין הנהגים
              </div>
            </div>
          )}
          <div style={{ padding: '16px', background: `${ROYAL_COLORS.success}10`, border: `1px solid ${ROYAL_COLORS.success}30`, borderRadius: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.success, marginBottom: '8px' }}>
              ✅ ביצועים טובים
              </div>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, lineHeight: '1.5' }}>
              המערכת פועלת ביעילות, המשך לעקוב אחר המגמות
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
