import React, { useState, useEffect } from 'react';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { AnalyticsService, type BusinessKPIs } from '../../services/modules/AnalyticsService';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundStatCard,
  UndergroundSelect,
  UndergroundEmptyState,
} from '../../components/underground';

type DateRangeOption = '7d' | '30d' | '90d' | 'all';

export function BusinessAnalytics() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<BusinessKPIs | null>(null);

  const analyticsService = currentBusinessId ? new AnalyticsService(currentBusinessId) : null;

  useEffect(() => {
    loadAnalytics();
  }, [currentBusinessId, dateRange]);

  const loadAnalytics = async () => {
    if (!analyticsService || !currentBusinessId) {
      logger.warn('[BusinessAnalytics] No business context');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const dateFilter = getDateRangeFilter(dateRange);
      const businessKPIs = await analyticsService.getBusinessKPIs(currentBusinessId, dateFilter);

      setKpis(businessKPIs);
      logger.info('[BusinessAnalytics] KPIs loaded:', businessKPIs);
    } catch (error) {
      logger.error('[BusinessAnalytics] Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = (range: DateRangeOption) => {
    const now = new Date();
    let daysAgo = 30;

    if (range === '7d') daysAgo = 7;
    if (range === '30d') daysAgo = 30;
    if (range === '90d') daysAgo = 90;
    if (range === 'all') {
      return {
        startDate: '2000-01-01',
        endDate: now.toISOString()
      };
    }

    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  const formatTrend = (trend: number): string => {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const getTrendColor = (trend: number): string => {
    if (trend > 0) return undergroundTheme.colors.status.success;
    if (trend < 0) return undergroundTheme.colors.status.danger;
    return undergroundTheme.colors.text.muted;
  };

  const exportReport = () => {
    if (!kpis) return;

    const csvData = [
      ['Business Analytics Report', `Date Range: ${dateRange}`],
      [],
      ['Revenue Metrics'],
      ['Total Revenue', formatCurrency(kpis.revenue.total)],
      ['Revenue Trend', formatTrend(kpis.revenue.trend)],
      [],
      ['Order Metrics'],
      ['Total Orders', kpis.orders.total],
      ['Completed', kpis.orders.completed],
      ['Pending', kpis.orders.pending],
      ['Cancelled', kpis.orders.cancelled],
      ['Order Trend', formatTrend(kpis.orders.trend)],
      [],
      ['Customer Metrics'],
      ['Total Customers', kpis.customers.total],
      ['New Customers', kpis.customers.new],
      ['Returning Customers', kpis.customers.returning],
      ['Customer Trend', formatTrend(kpis.customers.trend)],
      [],
      ['Inventory Metrics'],
      ['Total Products', kpis.inventory.totalProducts],
      ['Low Stock Items', kpis.inventory.lowStock],
      ['Out of Stock', kpis.inventory.outOfStock],
      ['Total Value', formatCurrency(kpis.inventory.totalValue)],
      [],
      ['Driver Metrics'],
      ['Active Drivers', kpis.drivers.active],
      ['Total Drivers', kpis.drivers.total],
      ['Average Rating', kpis.drivers.avgRating.toFixed(2)],
      ['Completion Rate', `${kpis.drivers.completionRate.toFixed(1)}%`],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${Date.now()}.csv`;
    a.click();
    logger.info('[BusinessAnalytics] Report exported');
  };

  if (!currentBusinessId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundEmptyState
          icon="📊"
          title="לא נבחר עסק"
          message="כדי לצפות באנליטיקס, עליך לבחור עסק פעיל"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundLoadingSpinner text="טוען אנליטיקס..." />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <UndergroundEmptyState
          icon="📊"
          title="אין נתונים זמינים"
          message="לא נמצאו נתוני אנליטיקס לתקופה הנבחרת"
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['3xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        icon="📊"
        title="אנליטיקס עסקית"
        subtitle="מדדי ביצועים ותובנות עסקיות"
        actions={
          <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, alignItems: 'center' }}>
            <UndergroundSelect
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              style={{ minWidth: '150px' }}
            >
              <option value="7d">7 ימים אחרונים</option>
              <option value="30d">30 ימים אחרונים</option>
              <option value="90d">90 ימים אחרונים</option>
              <option value="all">כל התקופה</option>
            </UndergroundSelect>
            <UndergroundButton onClick={exportReport} variant="primary">
              ייצוא CSV
            </UndergroundButton>
          </div>
        }
      />

      {/* Revenue Section */}
      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.xl,
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          הכנסות
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="💰"
            label="סה״כ הכנסות"
            value={formatCurrency(kpis.revenue.total)}
            trend={formatTrend(kpis.revenue.trend)}
            trendColor={getTrendColor(kpis.revenue.trend)}
          />
          <UndergroundStatCard
            icon="📈"
            label="מגמת הכנסות"
            value={formatTrend(kpis.revenue.trend)}
            color={getTrendColor(kpis.revenue.trend)}
          />
        </div>
      </UndergroundCard>

      {/* Orders Section */}
      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.xl,
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          הזמנות
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="📦"
            label="סה״כ הזמנות"
            value={kpis.orders.total}
            trend={formatTrend(kpis.orders.trend)}
            trendColor={getTrendColor(kpis.orders.trend)}
          />
          <UndergroundStatCard
            icon="✅"
            label="הושלמו"
            value={kpis.orders.completed}
            color={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            icon="⏳"
            label="בהמתנה"
            value={kpis.orders.pending}
            color={undergroundTheme.colors.status.warning}
          />
          <UndergroundStatCard
            icon="❌"
            label="בוטלו"
            value={kpis.orders.cancelled}
            color={undergroundTheme.colors.status.danger}
          />
        </div>
      </UndergroundCard>

      {/* Customers Section */}
      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.xl,
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          לקוחות
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="👥"
            label="סה״כ לקוחות"
            value={kpis.customers.total}
            trend={formatTrend(kpis.customers.trend)}
            trendColor={getTrendColor(kpis.customers.trend)}
          />
          <UndergroundStatCard
            icon="🆕"
            label="לקוחות חדשים"
            value={kpis.customers.new}
            color={undergroundTheme.colors.accent.primary}
          />
          <UndergroundStatCard
            icon="🔄"
            label="לקוחות חוזרים"
            value={kpis.customers.returning}
            color={undergroundTheme.colors.accent.secondary}
          />
        </div>
      </UndergroundCard>

      {/* Inventory Section */}
      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.xl,
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          מלאי
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="📦"
            label="סה״כ מוצרים"
            value={kpis.inventory.totalProducts}
          />
          <UndergroundStatCard
            icon="⚠️"
            label="מלאי נמוך"
            value={kpis.inventory.lowStock}
            color={undergroundTheme.colors.status.warning}
          />
          <UndergroundStatCard
            icon="🚫"
            label="אזל מהמלאי"
            value={kpis.inventory.outOfStock}
            color={undergroundTheme.colors.status.danger}
          />
          <UndergroundStatCard
            icon="💎"
            label="ערך המלאי"
            value={formatCurrency(kpis.inventory.totalValue)}
            color={undergroundTheme.colors.accent.primary}
          />
        </div>
      </UndergroundCard>

      {/* Drivers Section */}
      <UndergroundCard>
        <h3 style={{
          margin: 0,
          marginBottom: undergroundTheme.spacing.xl,
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary
        }}>
          נהגים
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundStatCard
            icon="🚗"
            label="נהגים פעילים"
            value={kpis.drivers.active}
            color={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            icon="👨‍✈️"
            label="סה״כ נהגים"
            value={kpis.drivers.total}
          />
          <UndergroundStatCard
            icon="⭐"
            label="דירוג ממוצע"
            value={kpis.drivers.avgRating.toFixed(1)}
            color={undergroundTheme.colors.accent.secondary}
          />
          <UndergroundStatCard
            icon="✅"
            label="שיעור השלמה"
            value={`${kpis.drivers.completionRate.toFixed(0)}%`}
            color={undergroundTheme.colors.accent.primary}
          />
        </div>
      </UndergroundCard>
    </div>
  );
}
