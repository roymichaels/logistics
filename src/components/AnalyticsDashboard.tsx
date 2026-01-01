import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { tokens, styles } from '../styles/tokens';
import { formatCurrency, hebrew } from '../lib/i18n';
import { Toast } from './Toast';

import { logger } from '../lib/logger';

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
      new: tokens.colors.status.info,
      confirmed: tokens.colors.status.success,
      preparing: tokens.colors.status.warning,
      ready: tokens.colors.brand.primary,
      out_for_delivery: tokens.colors.status.warning,
      delivered: tokens.colors.status.success,
      cancelled: tokens.colors.status.error
    };
    return colors[status] || tokens.colors.text.secondary;
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: tokens.colors.text.secondary }}>{hebrew.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.pageContainer, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={styles.pageTitle}>📊 ניתוח ביצועים</h1>
        <button
          onClick={loadAnalytics}
          style={{
            ...styles.button.secondary,
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

            }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: timeRange === range ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
              background: timeRange === range ? tokens.gradients.primary : tokens.colors.background.secondary,
              color: tokens.colors.text.primary,
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
          ...styles.card,
          background: `linear-gradient(135deg, ${tokens.colors.status.success}15, ${tokens.colors.background.secondary})`,
          border: `1px solid ${tokens.colors.status.success}30`
        }}>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: '500' }}>
            שיעור השלמה
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.success }}>
            {metrics.orderCompletionRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '8px' }}>
            מתוך כל ההזמנות
          </div>
        </div>

        <div style={{
          ...styles.card,
          background: `linear-gradient(135deg, ${tokens.colors.status.info}15, ${tokens.colors.background.secondary})`,
          border: `1px solid ${tokens.colors.status.info}30`
        }}>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: '500' }}>
            זמן משלוח ממוצע
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.info }}>
            {metrics.averageDeliveryTime}
          </div>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '8px' }}>
            דקות
          </div>
        </div>

        <div style={{
          ...styles.card,
          background: `linear-gradient(135deg, ${tokens.colors.status.warning}15, ${tokens.colors.background.secondary})`,
          border: `1px solid ${tokens.colors.status.warning}30`
        }}>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: '500' }}>
            שביעות רצון
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.warning, textShadow: tokens.glows.warning }}>
            {metrics.customerSatisfaction.toFixed(1)}
          </div>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '8px' }}>
            מתוך 5
          </div>
        </div>

        <div style={{
          ...styles.card,
          background: `linear-gradient(135deg, ${tokens.colors.brand.primary}15, ${tokens.colors.background.secondary})`,
          border: `1px solid ${tokens.colors.brand.primary}30`
        }}>
          <div style={{ fontSize: '14px', color: tokens.colors.text.secondary, marginBottom: '8px', fontWeight: '500' }}>
            ניצול נהגים
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.brand.primary }}>
            {metrics.driverUtilization}%
          </div>
          <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '8px' }}>
            ממוצע
          </div>
        </div>
      </div>

      {metrics.peakHours.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⏰ שעות שיא</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.peakHours.map(({ hour, orderCount }) => (
              <div
                key={hour}
                style={{
                  padding: '14px',
                  background: tokens.colors.background.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text.primary }}>
                    {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: tokens.colors.brand.primary }}>
                    {orderCount}
                  </div>
                  <div style={{ fontSize: '13px', color: tokens.colors.text.secondary }}>הזמנות</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(metrics.ordersByStatus).length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 הזמנות לפי סטטוס</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(metrics.ordersByStatus).map(([status, count]) => (
              <div
                key={status}
                style={{
                  padding: '14px',
                  background: tokens.colors.background.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text.primary }}>
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
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🏆 מוצרים מובילים</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.topProducts.map((product, index) => (
              <div
                key={index}
                style={{
                  padding: '14px',
                  background: index < 3
                    ? `linear-gradient(135deg, ${tokens.colors.status.warning}10, ${tokens.colors.background.secondary})`
                    : tokens.colors.background.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: index < 3 ? `1px solid ${tokens.colors.status.warning}30` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: index < 3 ? tokens.gradients.warning : tokens.colors.background.card,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: index < 3 ? '#1a0a00' : tokens.colors.text.primary
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text.primary, marginBottom: '2px' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '12px', color: tokens.colors.text.secondary }}>
                      {product.quantity} יחידות נמכרו
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: index < 3 ? tokens.colors.status.warning : tokens.colors.text.primary }}>
                  {formatCurrency(product.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>💡 המלצות</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metrics.orderCompletionRate < 90 && (
            <div style={{ padding: '16px', background: `${tokens.colors.status.warning}10`, border: `1px solid ${tokens.colors.status.warning}30`, borderRadius: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.status.warning, marginBottom: '8px' }}>
                ⚠️ שיעור השלמה נמוך
              </div>
              <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, lineHeight: '1.5' }}>
                שקול לבחון את תהליכי האספקה ולייעל את תיאום הנהגים
              </div>
            </div>
          )}
          {metrics.driverUtilization < 70 && (
            <div style={{ padding: '16px', background: `${tokens.colors.status.info}10`, border: `1px solid ${tokens.colors.status.info}30`, borderRadius: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.status.info, marginBottom: '8px' }}>
                ℹ️ ניצול נמוך של נהגים
              </div>
              <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, lineHeight: '1.5' }}>
                אפשר לייעל את חלוקת המשימות בין הנהגים
              </div>
            </div>
          )}
          <div style={{ padding: '16px', background: `${tokens.colors.status.success}10`, border: `1px solid ${tokens.colors.status.success}30`, borderRadius: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.status.success, marginBottom: '8px' }}>
              ✅ ביצועים טובים
              </div>
            <div style={{ fontSize: '13px', color: tokens.colors.text.secondary, lineHeight: '1.5' }}>
              המערכת פועלת ביעילות, המשך לעקוב אחר המגמות
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
