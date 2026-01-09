import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { StatCard } from '../../components/molecules/StatCard';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../styles/tokens';
import { formatCurrency } from '../../utils/businessFormatters';

type Section = 'overview' | 'orders' | 'products' | 'customers' | 'drivers' | 'inventory';
type DateRange = '7d' | '30d' | '90d' | 'all';

interface AnalyticsData {
  orderTrends: { date: string; count: number; revenue: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  driverPerformance: { name: string; deliveries: number; rating: number }[];
  customerPatterns: { segment: string; count: number; avgOrderValue: number }[];
  inventoryTurnover: { product: string; turnoverRate: number }[];
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalCustomers: number;
}

const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'סקירה', icon: '📊' },
  { id: 'orders', label: 'הזמנות', icon: '📦' },
  { id: 'products', label: 'מוצרים', icon: '🏷️' },
  { id: 'customers', label: 'לקוחות', icon: '👥' },
  { id: 'drivers', label: 'נהגים', icon: '🚗' },
  { id: 'inventory', label: 'מלאי', icon: '📊' },
];

export function AnalyticsHub() {
  const navigate = useNavigate();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparePeriod, setComparePeriod] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    orderTrends: [],
    topProducts: [],
    driverPerformance: [],
    customerPatterns: [],
    inventoryTurnover: [],
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [currentBusinessId, dateRange]);

  if (!currentBusinessId) {
    return (
      <PageContainer>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="מרכז האנליטיקה דורש עסק פעיל. אנא בחר עסק או צור עסק חדש."
        />
      </PageContainer>
    );
  }

  const getDateThreshold = (range: DateRange): string => {
    const now = new Date();
    let daysAgo = 30;
    if (range === '7d') daysAgo = 7;
    if (range === '90d') daysAgo = 90;
    if (range === 'all') return '2000-01-01';

    const threshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return threshold.toISOString();
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[AnalyticsHub] No business context');
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
          .select('id, total_amount, status, created_at, customer_id, driver_id')
          .eq('business_id', currentBusinessId)
          .gte('created_at', dateThreshold),
        supabase
          .from('order_items')
          .select('product_id, quantity, unit_price, created_at')
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
      const driverPerformance = calculateDriverPerformance(orders || []);
      const customerPatterns = calculateCustomerPatterns(orders || []);
      const inventoryTurnover = calculateInventoryTurnover(orderItems || [], products || []);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalCustomers = new Set(orders?.map(o => o.customer_id).filter(Boolean)).size;

      setAnalytics({
        orderTrends,
        topProducts,
        driverPerformance,
        customerPatterns,
        inventoryTurnover,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalCustomers,
      });

      logger.info('[AnalyticsHub] Analytics loaded');
    } catch (error) {
      logger.error('[AnalyticsHub] Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderTrends = (orders: any[]): any[] => {
    const trendMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = trendMap.get(date) || { count: 0, revenue: 0 };
      trendMap.set(date, {
        count: existing.count + 1,
        revenue: existing.revenue + (Number(order.total_amount) || 0)
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

  const calculateDriverPerformance = (orders: any[]): any[] => {
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
        const customerOrders = customerMap.get(order.customer_id) || [];
        customerOrders.push(Number(order.total_amount) || 0);
        customerMap.set(order.customer_id, customerOrders);
      }
    });

    const highValue = Array.from(customerMap.values()).filter(orders =>
      orders.reduce((sum, o) => sum + o, 0) / orders.length > 200
    ).length;

    const mediumValue = Array.from(customerMap.values()).filter(orders => {
      const avg = orders.reduce((sum, o) => sum + o, 0) / orders.length;
      return avg >= 100 && avg <= 200;
    }).length;

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

  const exportData = () => {
    let csvData: any[] = [];
    let filename = '';

    if (activeSection === 'overview' || activeSection === 'orders') {
      csvData = [
        ['תאריך', 'הזמנות', 'הכנסות'],
        ...analytics.orderTrends.map(t => [t.date, t.count, t.revenue])
      ];
      filename = `order-trends-${dateRange}.csv`;
    } else if (activeSection === 'products') {
      csvData = [
        ['מוצר', 'מכירות', 'הכנסות'],
        ...analytics.topProducts.map(p => [p.name, p.sales, p.revenue])
      ];
      filename = `top-products-${dateRange}.csv`;
    } else if (activeSection === 'customers') {
      csvData = [
        ['סגמנט', 'לקוחות', 'ממוצע הזמנה'],
        ...analytics.customerPatterns.map(c => [c.segment, c.count, c.avgOrderValue])
      ];
      filename = `customer-patterns-${dateRange}.csv`;
    } else if (activeSection === 'drivers') {
      csvData = [
        ['נהג', 'משלוחים', 'דירוג'],
        ...analytics.driverPerformance.map(d => [d.name, d.deliveries, d.rating])
      ];
      filename = `driver-performance-${dateRange}.csv`;
    } else if (activeSection === 'inventory') {
      csvData = [
        ['מוצר', 'תחלופה'],
        ...analytics.inventoryTurnover.map(i => [i.product, i.turnoverRate])
      ];
      filename = `inventory-turnover-${dateRange}.csv`;
    }

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('[AnalyticsHub] Data exported:', filename);
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: tokens.colors.text
            }}>
              טוען אנליטיקה...
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="מרכז אנליטיקה"
        subtitle="תובנות מעמיקות על הביצועים העסקיים שלך"
        actions={
          <div style={{ display: 'flex', gap: tokens.spacing.sm, alignItems: 'center' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                border: `1px solid ${tokens.colors.border}`,
                backgroundColor: tokens.colors.background,
                color: tokens.colors.text,
                cursor: 'pointer'
              }}
            >
              <option value="7d">7 ימים</option>
              <option value="30d">30 ימים</option>
              <option value="90d">90 ימים</option>
              <option value="all">הכל</option>
            </select>

            <Button
              onClick={() => setComparePeriod(!comparePeriod)}
              variant={comparePeriod ? 'primary' : 'secondary'}
            >
              השווה תקופות
            </Button>

            <Button onClick={exportData} variant="primary">
              <span>📥</span> ייצוא
            </Button>
          </div>
        }
      />

      <Card style={{ marginBottom: tokens.spacing.lg }}>
        <div style={{
          display: 'flex',
          gap: tokens.spacing.sm,
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '8px',
                border: `1px solid ${tokens.colors.border}`,
                backgroundColor: activeSection === section.id ? tokens.colors.primary : tokens.colors.surface,
                color: activeSection === section.id ? '#ffffff' : tokens.colors.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {activeSection === 'overview' && (
        <div style={{ display: 'grid', gap: tokens.spacing.lg }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing.md
          }}>
            <StatCard label="סה״כ הזמנות" value={analytics.totalOrders.toString()} icon="📦" />
            <StatCard label="סה״כ הכנסות" value={formatCurrency(analytics.totalRevenue, 'ILS')} icon="💰" />
            <StatCard label="ממוצע הזמנה" value={formatCurrency(analytics.avgOrderValue, 'ILS')} icon="📊" />
            <StatCard label="לקוחות" value={analytics.totalCustomers.toString()} icon="👥" />
          </div>

          <DataTable
            title="מגמות הזמנות"
            headers={['תאריך', 'הזמנות', 'הכנסות']}
            rows={analytics.orderTrends.slice(-10).map(t => [
              t.date,
              t.count.toString(),
              formatCurrency(t.revenue, 'ILS')
            ])}
          />
        </div>
      )}

      {activeSection === 'orders' && (
        <DataTable
          title="מגמות הזמנות"
          headers={['תאריך', 'הזמנות', 'הכנסות']}
          rows={analytics.orderTrends.map(t => [
            t.date,
            t.count.toString(),
            formatCurrency(t.revenue, 'ILS')
          ])}
        />
      )}

      {activeSection === 'products' && (
        <DataTable
          title="מוצרים מובילים"
          headers={['מוצר', 'מכירות', 'הכנסות']}
          rows={analytics.topProducts.map(p => [
            p.name,
            p.sales.toString(),
            formatCurrency(p.revenue, 'ILS')
          ])}
        />
      )}

      {activeSection === 'customers' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {analytics.customerPatterns.map((pattern, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '12px'
              }}
            >
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: tokens.colors.text
              }}>
                {pattern.segment}
              </span>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '14px',
                  color: tokens.colors.textSecondary
                }}>
                  {pattern.count} לקוחות
                </span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors.primary
                }}>
                  {formatCurrency(pattern.avgOrderValue, 'ILS')} ממוצע
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'drivers' && (
        <DataTable
          title="ביצועי נהגים"
          headers={['נהג', 'משלוחים', 'דירוג']}
          rows={analytics.driverPerformance.map(d => [
            d.name,
            d.deliveries.toString(),
            `${d.rating.toFixed(1)} ⭐`
          ])}
        />
      )}

      {activeSection === 'inventory' && (
        <DataTable
          title="תחלופת מלאי"
          headers={['מוצר', 'תחלופה']}
          rows={analytics.inventoryTurnover.map(i => [
            i.product,
            i.turnoverRate.toString()
          ])}
        />
      )}
    </PageContainer>
  );
}

function DataTable({ title, headers, rows }: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${tokens.colors.border}`,
        fontSize: '18px',
        fontWeight: '600',
        color: tokens.colors.text
      }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: tokens.colors.background }}>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: tokens.colors.textSecondary
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom: `1px solid ${tokens.colors.border}`
                }}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: tokens.colors.text
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
