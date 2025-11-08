import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { formatCurrency, hebrew } from '../lib/i18n';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';

interface FinancialDashboardProps {
  dataStore: DataStore;
  user: User | null;
  businessId?: string | null;
  onNavigate: (page: string) => void;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  completedOrders: number;
  pendingPayments: number;
}

interface RevenueByCategory {
  category: string;
  revenue: number;
  percentage: number;
}

export function FinancialDashboard({ dataStore, user, businessId, onNavigate }: FinancialDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingPayments: 0
  });
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadFinancialData();
  }, [dataStore, businessId, timeRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const orders = await dataStore.listOrders?.() || [];

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfMonth.getDate() - 30);

      const startOfYear = new Date(startOfToday);
      startOfYear.setFullYear(startOfYear.getFullYear() - 1);

      const completedOrders = orders.filter(o => o.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const todayOrders = completedOrders.filter(o => new Date(o.created_at) >= startOfToday);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const weekOrders = completedOrders.filter(o => new Date(o.created_at) >= startOfWeek);
      const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const monthOrders = completedOrders.filter(o => new Date(o.created_at) >= startOfMonth);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const yearOrders = completedOrders.filter(o => new Date(o.created_at) >= startOfYear);
      const yearRevenue = yearOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const pendingOrders = orders.filter(o =>
        ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
      );
      const pendingPayments = pendingOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const estimatedCosts = totalRevenue * 0.35;
      const netProfit = totalRevenue - estimatedCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalCosts: estimatedCosts,
        netProfit,
        profitMargin,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        yearRevenue,
        averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingPayments
      });

      const categoryRevenue = new Map<string, number>();
      completedOrders.forEach(order => {
        const category = (order as any).category || 'כללי';
        categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + Number(order.total_amount || 0));
      });

      const categoryArray = Array.from(categoryRevenue.entries())
        .map(([category, revenue]) => ({
          category,
          revenue,
          percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setRevenueByCategory(categoryArray);
    } catch (error) {
      logger.error('Failed to load financial data:', error);
      Toast.error('שגיאה בטעינת נתונים כספיים');
    } finally {
      setLoading(false);
    }
  };

  const handleExportFinancialReport = (format: 'csv' | 'json') => {
    try {
      const report = {
        generated_at: new Date().toISOString(),
        generated_by: user?.name || user?.telegram_id,
        business_id: businessId,
        metrics,
        revenue_by_category: revenueByCategory
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        let csv = 'Financial Report\n\n';
        csv += 'Metric,Value\n';
        csv += `Total Revenue,${metrics.totalRevenue}\n`;
        csv += `Total Costs,${metrics.totalCosts}\n`;
        csv += `Net Profit,${metrics.netProfit}\n`;
        csv += `Profit Margin,${metrics.profitMargin}%\n`;
        csv += `Today Revenue,${metrics.todayRevenue}\n`;
        csv += `Week Revenue,${metrics.weekRevenue}\n`;
        csv += `Month Revenue,${metrics.monthRevenue}\n`;
        csv += `Year Revenue,${metrics.yearRevenue}\n`;
        csv += `Average Order Value,${metrics.averageOrderValue}\n`;
        csv += `Total Orders,${metrics.totalOrders}\n`;
        csv += `Completed Orders,${metrics.completedOrders}\n`;
        csv += `Pending Payments,${metrics.pendingPayments}\n`;
        csv += '\n\nRevenue by Category\n';
        csv += 'Category,Revenue,Percentage\n';
        revenueByCategory.forEach(cat => {
          csv += `${cat.category},${cat.revenue},${cat.percentage.toFixed(2)}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      Toast.success('דוח כספי יוצא בהצלחה');
      telegram.hapticFeedback('success');
    } catch (error) {
      logger.error('Failed to export financial report:', error);
      Toast.error('שגיאה בייצוא דוח כספי');
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <div style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...ROYAL_STYLES.pageContainer, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={ROYAL_STYLES.pageTitle}>💰 לוח כספי</h1>
        <button
          onClick={loadFinancialData}
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
        {['day', 'week', 'month', 'year'].map((range) => (
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
            {range === 'day' && 'היום'}
            {range === 'week' && 'שבוע'}
            {range === 'month' && 'חודש'}
            {range === 'year' && 'שנה'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.gold}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.gold}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            סך הכנסות
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.gold, textShadow: ROYAL_COLORS.glowGold }}>
            {formatCurrency(metrics.totalRevenue)}
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.success}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.success}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            רווח נקי
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.success }}>
            {formatCurrency(metrics.netProfit)}
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.info}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.info}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            שולי רווח
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.info }}>
            {metrics.profitMargin.toFixed(1)}%
          </div>
        </div>

        <div style={{
          ...ROYAL_STYLES.card,
          background: `linear-gradient(135deg, ${ROYAL_COLORS.warning}15, ${ROYAL_COLORS.secondary})`,
          border: `1px solid ${ROYAL_COLORS.warning}30`
        }}>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px', fontWeight: '500' }}>
            תשלומים ממתינים
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.warning }}>
            {formatCurrency(metrics.pendingPayments)}
          </div>
        </div>
      </div>

      <div style={ROYAL_STYLES.card}>
        <h3 style={ROYAL_STYLES.cardTitle}>📊 הכנסות לפי תקופה</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>היום</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: ROYAL_COLORS.text }}>
              {formatCurrency(metrics.todayRevenue)}
            </div>
          </div>
          <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>שבוע</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: ROYAL_COLORS.text }}>
              {formatCurrency(metrics.weekRevenue)}
            </div>
          </div>
          <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>חודש</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: ROYAL_COLORS.text }}>
              {formatCurrency(metrics.monthRevenue)}
            </div>
          </div>
          <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>שנה</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: ROYAL_COLORS.text }}>
              {formatCurrency(metrics.yearRevenue)}
            </div>
          </div>
        </div>
      </div>

      {revenueByCategory.length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={ROYAL_STYLES.cardTitle}>📈 הכנסות לפי קטגוריה</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {revenueByCategory.map(cat => (
              <div
                key={cat.category}
                style={{
                  padding: '16px',
                  background: ROYAL_COLORS.secondary,
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    {cat.category}
                  </div>
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                    {cat.percentage.toFixed(1)}% מסך ההכנסות
                  </div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
                  {formatCurrency(cat.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={ROYAL_STYLES.card}>
        <h3 style={ROYAL_STYLES.cardTitle}>📥 ייצוא דוחות</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => handleExportFinancialReport('json')}
            style={{
              ...ROYAL_STYLES.buttonPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span>📄</span>
            <span>ייצוא דוח JSON</span>
          </button>
          <button
            onClick={() => handleExportFinancialReport('csv')}
            style={{
              ...ROYAL_STYLES.buttonSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span>📊</span>
            <span>ייצוא דוח CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
