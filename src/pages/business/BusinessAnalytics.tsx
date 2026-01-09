import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundSection,
} from '../../components/underground';

interface AnalyticsData {
  orderTrends: { date: string; count: number; revenue: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  driverPerformance: { name: string; deliveries: number; rating: number }[];
  customerPatterns: { segment: string; count: number; avgOrderValue: number }[];
  inventoryTurnover: { product: string; turnoverRate: number }[];
}

export function BusinessAnalytics() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    orderTrends: [],
    topProducts: [],
    driverPerformance: [],
    customerPatterns: [],
    inventoryTurnover: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [currentBusinessId, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessAnalytics] No business context');
        return;
      }

      const dateThreshold = getDateThreshold(dateRange);

      const [
        { data: orders },
        { data: orderItems },
        { data: products },
        { data: drivers }
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, status, created_at, customer_id, driver_id')
          .eq('business_id', currentBusinessId)
          .gte('created_at', dateThreshold),
        supabase
          .from('order_items')
          .select('product_id, quantity, unit_price')
          .gte('created_at', dateThreshold),
        supabase
          .from('products')
          .select('id, name')
          .eq('business_id', currentBusinessId),
        supabase
          .from('driver_profiles')
          .select('id, active')
          .eq('business_id', currentBusinessId)
      ]);

      const orderTrends = calculateOrderTrends(orders || []);
      const topProducts = calculateTopProducts(orderItems || [], products || []);
      const driverPerformance = calculateDriverPerformance(orders || [], drivers || []);
      const customerPatterns = calculateCustomerPatterns(orders || []);
      const inventoryTurnover = calculateInventoryTurnover(orderItems || [], products || []);

      setAnalytics({
        orderTrends,
        topProducts,
        driverPerformance,
        customerPatterns,
        inventoryTurnover
      });

      logger.info('[BusinessAnalytics] Analytics loaded');
    } catch (error) {
      logger.error('[BusinessAnalytics] Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateThreshold = (range: string): string => {
    const now = new Date();
    let daysAgo = 30;
    if (range === '7d') daysAgo = 7;
    if (range === '90d') daysAgo = 90;
    if (range === 'all') return '2000-01-01';

    const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return threshold.toISOString();
  };

  const calculateOrderTrends = (orders: any[]): any[] => {
    const trendMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { count: 0, revenue: 0 };
      trendMap.set(date, {
        count: existing.count + 1,
        revenue: existing.revenue + (Number(order.total) || 0)
      });
    });

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateTopProducts = (orderItems: any[], products: any[]): any[] => {
    const productMap = new Map(products.map(p => [p.id, p.name]));
    const salesMap = new Map<string, { sales: number; revenue: number }>();

    orderItems.forEach(item => {
      const productName = productMap.get(item.product_id) || 'Unknown';
      const existing = salesMap.get(productName) || { sales: 0, revenue: 0 };
      salesMap.set(productName, {
        sales: existing.sales + (item.quantity || 0),
        revenue: existing.revenue + ((item.quantity || 0) * (item.unit_price || 0))
      });
    });

    return Array.from(salesMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const calculateDriverPerformance = (orders: any[], drivers: any[]): any[] => {
    const driverMap = new Map<string, { deliveries: number; rating: number }>();

    orders.forEach(order => {
      if (order.driver_id && order.status === 'delivered') {
        const existing = driverMap.get(order.driver_id) || { deliveries: 0, rating: 4.5 };
        driverMap.set(order.driver_id, {
          deliveries: existing.deliveries + 1,
          rating: existing.rating
        });
      }
    });

    return Array.from(driverMap.entries())
      .map(([id, data]) => ({ name: `נהג ${id.slice(0, 8)}`, ...data }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 10);
  };

  const calculateCustomerPatterns = (orders: any[]): any[] => {
    const customerMap = new Map<string, number[]>();

    orders.forEach(order => {
      if (order.customer_id) {
        const orders = customerMap.get(order.customer_id) || [];
        orders.push(Number(order.total) || 0);
        customerMap.set(order.customer_id, orders);
      }
    });

    const highValue = Array.from(customerMap.values()).filter(orders =>
      orders.reduce((sum, o) => sum + o, 0) / orders.length > 200
    ).length;

    const mediumValue = Array.from(customerMap.values()).filter(orders =>
      orders.reduce((sum, o) => sum + o, 0) / orders.length >= 100 && orders.reduce((sum, o) => sum + o, 0) / orders.length <= 200
    ).length;

    const lowValue = customerMap.size - highValue - mediumValue;

    return [
      { segment: 'לקוחות בעלי ערך גבוה', count: highValue, avgOrderValue: 250 },
      { segment: 'לקוחות בעלי ערך בינוני', count: mediumValue, avgOrderValue: 150 },
      { segment: 'לקוחות בעלי ערך נמוך', count: lowValue, avgOrderValue: 75 }
    ];
  };

  const calculateInventoryTurnover = (orderItems: any[], products: any[]): any[] => {
    const productMap = new Map(products.map(p => [p.id, p.name]));
    const turnoverMap = new Map<string, number>();

    orderItems.forEach(item => {
      const productName = productMap.get(item.product_id) || 'Unknown';
      const existing = turnoverMap.get(productName) || 0;
      turnoverMap.set(productName, existing + (item.quantity || 0));
    });

    return Array.from(turnoverMap.entries())
      .map(([product, quantity]) => ({ product, turnoverRate: quantity }))
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 10);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportData = () => {
    const csvData = [
      ['תאריך', 'הזמנות', 'הכנסות'],
      ...analytics.orderTrends.map(t => [t.date, t.count, t.revenue])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}.csv`;
    a.click();
    logger.info('[BusinessAnalytics] Data exported');
  };

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="טוען אנליטיקה..." />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        icon="📊"
        title="אנליטיקה עסקית"
        subtitle="תובנות מעמיקות על הביצועים העסקיים שלך"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: undergroundTheme.spacing['2xl'] }}>
        <UndergroundButton onClick={exportData} variant="primary">
          ייצוא נתונים
        </UndergroundButton>
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['7d', '30d', '90d', 'all'] as const).map(range => (
            <UndergroundButton
              key={range}
              onClick={() => setDateRange(range)}
              variant={dateRange === range ? 'primary' : 'secondary'}
            >
              {range === '7d' ? '7 ימים' : range === '30d' ? '30 ימים' : range === '90d' ? '90 ימים' : 'הכל'}
            </UndergroundButton>
          ))}
        </div>
      </UndergroundCard>

      <div style={{ display: 'grid', gap: undergroundTheme.spacing['2xl'] }}>
        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            מגמות הזמנות
          </h3>
          <UndergroundCard>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  }}>
                    <th style={{
                      padding: undergroundTheme.spacing.lg,
                      textAlign: 'right',
                      color: undergroundTheme.colors.text.secondary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>תאריך</th>
                    <th style={{
                      padding: undergroundTheme.spacing.lg,
                      textAlign: 'right',
                      color: undergroundTheme.colors.text.secondary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>הזמנות</th>
                    <th style={{
                      padding: undergroundTheme.spacing.lg,
                      textAlign: 'right',
                      color: undergroundTheme.colors.text.secondary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>הכנסות</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.orderTrends.slice(-10).map((trend, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                        transition: undergroundTheme.transitions.fast,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.text.primary }}>{trend.date}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.accent.primary, fontWeight: 600 }}>{trend.count}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.status.success, fontWeight: 600 }}>{formatCurrency(trend.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UndergroundCard>
        </UndergroundSection>

        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            מוצרים מובילים
          </h3>
          <UndergroundCard>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>מוצר</th>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>מכירות</th>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>הכנסות</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`, transition: undergroundTheme.transitions.fast }} onMouseEnter={(e) => { e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.text.primary }}>{product.name}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.accent.primary, fontWeight: 600 }}>{product.sales}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.status.success, fontWeight: 600 }}>{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UndergroundCard>
        </UndergroundSection>

        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            ביצועי נהגים
          </h3>
          <UndergroundCard>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>נהג</th>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>משלוחים</th>
                    <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold, fontSize: undergroundTheme.typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>דירוג</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.driverPerformance.map((driver, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`, transition: undergroundTheme.transitions.fast }} onMouseEnter={(e) => { e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.text.primary }}>{driver.name}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.accent.primary, fontWeight: 600 }}>{driver.deliveries}</td>
                      <td style={{ padding: undergroundTheme.spacing.md, color: undergroundTheme.colors.status.warning }}>{driver.rating.toFixed(1)} ⭐</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UndergroundCard>
        </UndergroundSection>

        <UndergroundSection>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            marginBottom: undergroundTheme.spacing.lg,
            color: undergroundTheme.colors.text.primary
          }}>
            דפוסי לקוחות
          </h3>
          <div style={{ display: 'grid', gap: undergroundTheme.spacing.lg }}>
            {analytics.customerPatterns.map((pattern, idx) => (
              <UndergroundCard
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: undergroundTheme.transitions.normal,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = undergroundTheme.effects.hover.lift;
                  e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.borderHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
                }}
              >
                <span style={{
                  color: undergroundTheme.colors.text.primary,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                }}>{pattern.segment}</span>
                <div style={{ display: 'flex', gap: undergroundTheme.spacing['2xl'] }}>
                  <span style={{ color: undergroundTheme.colors.text.secondary }}>{pattern.count} לקוחות</span>
                  <span style={{
                    color: undergroundTheme.colors.accent.primary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  }}>{formatCurrency(pattern.avgOrderValue)} ממוצע</span>
                </div>
              </UndergroundCard>
            ))}
          </div>
        </UndergroundSection>
      </div>
    </div>
  );
}
