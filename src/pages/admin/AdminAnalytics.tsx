import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundSection,
  UndergroundStatCard,
  UndergroundLoadingSpinner,
  UndergroundButton
} from '../../components/underground';

interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalOrders: number;
  totalRevenue: number;
  totalDrivers: number;
  activeDrivers: number;
  totalUsers: number;
  ordersToday: number;
  totalProducts: number;
}

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      const [businessesResult, usersResult, ordersResult, driversResult, productsResult] = await Promise.all([
        supabase.from('businesses').select('id, status, created_at', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_price, created_at', { count: 'exact' }),
        supabase.from('driver_profiles').select('id, status', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' })
      ]);

      const safeBusinesses = businessesResult.data || [];
      const safeOrders = ordersResult.data || [];
      const safeDrivers = driversResult.data || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const ordersToday = safeOrders.filter(o => new Date(o.created_at) >= todayStart).length;

      const activeBusinesses = safeBusinesses.filter(b => b.status === 'active').length;
      const activeDrivers = safeDrivers.filter(d => d.status === 'active').length;

      const totalRevenue = safeOrders.reduce((sum, order) => {
        return sum + (order.total_price || 0);
      }, 0);

      setMetrics({
        totalBusinesses: businessesResult.count || 0,
        activeBusinesses,
        totalOrders: ordersResult.count || 0,
        totalRevenue,
        totalDrivers: driversResult.count || 0,
        activeDrivers,
        totalUsers: usersResult.count || 0,
        ordersToday,
        totalProducts: productsResult.count || 0
      });
    } catch (error) {
      logger.error('Failed to load admin analytics', { error });
    } finally {
      setLoading(false);
    }
  };

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
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Real-time platform metrics and performance indicators
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadMetrics}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: undergroundTheme.spacing.lg,
            marginBottom: undergroundTheme.spacing['3xl']
          }}>
            <UndergroundStatCard
              label="Total Businesses"
              value={metrics.totalBusinesses}
              icon="🏪"
              trend={{ value: metrics.activeBusinesses, label: 'active' }}
            />

            <UndergroundStatCard
              label="Total Orders"
              value={metrics.totalOrders}
              icon="📦"
              trend={{ value: metrics.ordersToday, label: 'today' }}
            />

            <UndergroundStatCard
              label="Total Revenue"
              value={`$${(metrics.totalRevenue / 100).toFixed(2)}`}
              icon="💰"
            />

            <UndergroundStatCard
              label="Total Drivers"
              value={metrics.totalDrivers}
              icon="🚚"
              trend={{ value: metrics.activeDrivers, label: 'active' }}
            />

            <UndergroundStatCard
              label="Total Users"
              value={metrics.totalUsers}
              icon="👥"
            />

            <UndergroundStatCard
              label="Total Products"
              value={metrics.totalProducts}
              icon="📦"
            />
          </div>

          <UndergroundCard>
            <h3 style={{
              margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              Key Performance Indicators
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
                  ${metrics.totalOrders > 0 ? ((metrics.totalRevenue / 100) / metrics.totalOrders).toFixed(2) : '0.00'}
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
                  Active Business Rate
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
                  Active Driver Rate
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalDrivers > 0 ? ((metrics.activeDrivers / metrics.totalDrivers) * 100).toFixed(0) : '0'}%
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Products per Business
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalBusinesses > 0 ? (metrics.totalProducts / metrics.totalBusinesses).toFixed(1) : '0'}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.xs
                }}>
                  Today's Order Rate
                </div>
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {metrics.totalOrders > 0 ? ((metrics.ordersToday / metrics.totalOrders) * 100).toFixed(1) : '0'}%
                </div>
              </div>
            </div>
          </UndergroundCard>
        </UndergroundSection>
      </div>
    </div>
  );
}
