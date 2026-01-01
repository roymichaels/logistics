import React, { useEffect, useState } from 'react';
import { colors, spacing } from '../../styles/theme';
import { DataStore, User } from '../../data/types';
import { logger } from '../../lib/logger';
import { getUserDisplayName } from '../../utils/userIdentifier';
import { MetricCard, MetricGrid } from '../../components/dashboard/MetricCard';

interface AdminAnalyticsProps {
  dataStore: DataStore;
}

interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalOrders: number;
  totalRevenue: number;
  totalDrivers: number;
  activeDrivers: number;
  totalUsers: number;
  ordersToday: number;
}

export function AdminAnalytics({ dataStore }: AdminAnalyticsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [profile, businesses, orders, drivers, users] = await Promise.all([
          dataStore.getProfile(),
          dataStore.listBusinesses(),
          dataStore.listOrders(),
          dataStore.listDrivers?.() ?? Promise.resolve([]),
          dataStore.listUsers?.() ?? Promise.resolve([])
        ]);

        if (!mounted) return;

        setUser(profile);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const ordersToday = orders.filter(o => new Date(o.created_at) >= todayStart).length;

        const activeBusinesses = businesses.filter(b => b.status === 'active').length;
        const activeDrivers = drivers.filter(d => d.status === 'active').length;

        const totalRevenue = orders.reduce((sum, order) => {
          return sum + (order.total_price || 0);
        }, 0);

        setMetrics({
          totalBusinesses: businesses.length,
          activeBusinesses,
          totalOrders: orders.length,
          totalRevenue,
          totalDrivers: drivers.length,
          activeDrivers,
          totalUsers: users.length,
          ordersToday
        });
      } catch (error) {
        logger.error('Failed to load admin analytics', error as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background.primary,
          color: colors.text.primary,
          padding: spacing['2xl'],
          direction: 'rtl'
        }}
      >
        <h1 style={{ fontSize: '24px', margin: '0 0 16px', fontWeight: '700' }}>
          ניתוח פלטפורמה
        </h1>
        <p style={{ margin: '0 0 24px', color: colors.text.secondary }}>
          טוען נתונים...
        </p>
        <div style={{ display: 'grid', gap: spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: '16px',
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border.primary}`,
                padding: spacing['2xl'],
                height: '100px'
              }}
            >
              <div
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: colors.status.infoFaded,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.background.primary,
          color: colors.text.primary,
          padding: spacing['2xl'],
          direction: 'rtl',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <p style={{ color: colors.text.secondary }}>לא ניתן לטעון נתונים</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        padding: spacing['2xl'],
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: '700' }}>
        ניתוח פלטפורמה {user ? `• ${getUserDisplayName(user)}` : ''}
      </h1>
      <p style={{ margin: '0 0 24px', color: colors.text.secondary, fontSize: '14px' }}>
        סקירה כללית של הפעילות והביצועים במערכת
      </p>

      <MetricGrid columns={3}>
        <MetricCard
          label="עסקים פעילים"
          value={metrics.activeBusinesses}
          subtitle={`מתוך ${metrics.totalBusinesses} סה"כ`}
          icon="🏢"
          variant="primary"
        />
        <MetricCard
          label='הזמנות סה"כ'
          value={metrics.totalOrders}
          subtitle={`${metrics.ordersToday} היום`}
          icon="📦"
          variant="success"
        />
        <MetricCard
          label="הכנסות כוללות"
          value={`₪${metrics.totalRevenue.toLocaleString()}`}
          icon="💰"
          variant="warning"
        />
        <MetricCard
          label="נהגים פעילים"
          value={metrics.activeDrivers}
          subtitle={`מתוך ${metrics.totalDrivers} סה"כ`}
          icon="🚗"
          variant="default"
        />
        <MetricCard
          label="משתמשים רשומים"
          value={metrics.totalUsers}
          icon="👥"
          variant="default"
        />
        <MetricCard
          label="ממוצע הזמנה"
          value={
            metrics.totalOrders > 0
              ? `₪${Math.round(metrics.totalRevenue / metrics.totalOrders).toLocaleString()}`
              : '₪0'
          }
          icon="📊"
          variant="default"
        />
      </MetricGrid>

      <div
        style={{
          marginTop: spacing['4xl'],
          padding: spacing['3xl'],
          borderRadius: '16px',
          background: colors.ui.card,
          border: `1px solid ${colors.border.primary}`
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: spacing.lg, color: colors.text.primary }}>
          סטטוס מערכת
        </h2>
        <div style={{ display: 'grid', gap: spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.text.secondary }}>תפעול:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.status.success, fontWeight: '600' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.status.success }} />
              פעיל
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.text.secondary }}>זמן פעילות:</span>
            <span style={{ fontWeight: '600', color: colors.text.primary }}>99.9%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.text.secondary }}>גרסה:</span>
            <span style={{ fontWeight: '600', color: colors.text.primary }}>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
