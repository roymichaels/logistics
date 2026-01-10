import React, { useEffect, useState } from 'react';
import { DataStore, User } from '../../data/types';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundSection,
  UndergroundStatCard,
  UndergroundLoadingSpinner
} from '../../components/underground';

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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundCard>
          <div style={{ textAlign: 'center', padding: undergroundTheme.spacing['4xl'] }}>
            <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>⚠️</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              Failed to load analytics
            </div>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundSection
          title="Platform Analytics"
          icon="📊"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: undergroundTheme.spacing.lg,
            marginBottom: undergroundTheme.spacing['3xl']
          }}>
            <UndergroundStatCard
              title="Total Businesses"
              value={metrics.totalBusinesses}
              icon="🏪"
              subtitle={`${metrics.activeBusinesses} active`}
            />

            <UndergroundStatCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon="📦"
              subtitle={`${metrics.ordersToday} today`}
            />

            <UndergroundStatCard
              title="Total Revenue"
              value={`₪${metrics.totalRevenue.toFixed(2)}`}
              icon="💰"
              subtitle="All time"
            />

            <UndergroundStatCard
              title="Total Drivers"
              value={metrics.totalDrivers}
              icon="🚚"
              subtitle={`${metrics.activeDrivers} active`}
            />

            <UndergroundStatCard
              title="Total Users"
              value={metrics.totalUsers}
              icon="👥"
              subtitle="Platform-wide"
            />

            <UndergroundStatCard
              title="Orders Today"
              value={metrics.ordersToday}
              icon="📈"
              subtitle="Last 24 hours"
            />
          </div>

          <UndergroundCard>
            <h3 style={{
              margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              Quick Stats
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.lg
            }}>
              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Avg Revenue per Order
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  ₪{metrics.totalOrders > 0 ? (metrics.totalRevenue / metrics.totalOrders).toFixed(2) : '0.00'}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Orders per Business
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalBusinesses > 0 ? (metrics.totalOrders / metrics.totalBusinesses).toFixed(1) : '0'}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Active Business %
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalBusinesses > 0 ? ((metrics.activeBusinesses / metrics.totalBusinesses) * 100).toFixed(0) : '0'}%
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Active Driver %
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalDrivers > 0 ? ((metrics.activeDrivers / metrics.totalDrivers) * 100).toFixed(0) : '0'}%
                </div>
              </div>
            </div>
          </UndergroundCard>
        </UndergroundSection>
      </div>
    </div>
  );
}
