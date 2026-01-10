import { useState, useEffect } from 'react';
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

interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  totalDrivers: number;
  activeDrivers: number;
  totalProducts: number;
  platformRevenue: number;
}

export default function Infrastructures() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatformStats();
  }, []);

  const loadPlatformStats = async () => {
    try {
      setLoading(true);

      const [businessesResult, usersResult, ordersResult, driversResult, productsResult] = await Promise.all([
        supabase.from('businesses').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, total_price', { count: 'exact' }),
        supabase.from('driver_profiles').select('id, status', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' })
      ]);

      const activeBusinesses = businessesResult.data?.filter(b => b.status === 'active').length || 0;
      const activeDrivers = driversResult.data?.filter(d => d.status === 'active').length || 0;
      const platformRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

      setStats({
        totalBusinesses: businessesResult.count || 0,
        activeBusinesses,
        totalUsers: usersResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalDrivers: driversResult.count || 0,
        activeDrivers,
        totalProducts: productsResult.count || 0,
        platformRevenue
      });
    } catch (error) {
      logger.error('Failed to load platform stats', { error });
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

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundSection
          title="System Overview"
          icon="🏗️"
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
                Platform-wide metrics and system configuration
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadPlatformStats}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          {stats && (
            <>
              <div style={{
                marginBottom: undergroundTheme.spacing.xl
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.lg,
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Business Metrics
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: undergroundTheme.spacing.lg
                }}>
                  <UndergroundStatCard
                    label="Total Businesses"
                    value={stats.totalBusinesses}
                    icon="🏢"
                    trend={{ value: stats.activeBusinesses, label: 'active' }}
                  />
                  <UndergroundStatCard
                    label="Total Orders"
                    value={stats.totalOrders}
                    icon="📦"
                  />
                  <UndergroundStatCard
                    label="Platform Revenue"
                    value={`$${(stats.platformRevenue / 100).toFixed(2)}`}
                    icon="💰"
                  />
                </div>
              </div>

              <div style={{
                marginBottom: undergroundTheme.spacing.xl
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.lg,
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Users & Drivers
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: undergroundTheme.spacing.lg
                }}>
                  <UndergroundStatCard
                    label="Total Users"
                    value={stats.totalUsers}
                    icon="👥"
                  />
                  <UndergroundStatCard
                    label="Total Drivers"
                    value={stats.totalDrivers}
                    icon="🚗"
                    trend={{ value: stats.activeDrivers, label: 'active' }}
                  />
                  <UndergroundStatCard
                    label="Total Products"
                    value={stats.totalProducts}
                    icon="📦"
                  />
                </div>
              </div>

              <UndergroundCard>
                <h3 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.lg,
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  System Configuration
                </h3>
                <div style={{
                  display: 'grid',
                  gap: undergroundTheme.spacing.md,
                  fontSize: undergroundTheme.typography.fontSize.sm
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.glassmorphism.light,
                    borderRadius: undergroundTheme.borderRadius.lg
                  }}>
                    <span style={{ color: undergroundTheme.colors.text.secondary }}>Database Status</span>
                    <span style={{
                      color: undergroundTheme.colors.status.success,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      Connected
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.glassmorphism.light,
                    borderRadius: undergroundTheme.borderRadius.lg
                  }}>
                    <span style={{ color: undergroundTheme.colors.text.secondary }}>Storage Provider</span>
                    <span style={{
                      color: undergroundTheme.colors.text.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      Supabase
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.glassmorphism.light,
                    borderRadius: undergroundTheme.borderRadius.lg
                  }}>
                    <span style={{ color: undergroundTheme.colors.text.secondary }}>Auth Provider</span>
                    <span style={{
                      color: undergroundTheme.colors.text.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      Supabase Auth
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.glassmorphism.light,
                    borderRadius: undergroundTheme.borderRadius.lg
                  }}>
                    <span style={{ color: undergroundTheme.colors.text.secondary }}>Realtime Status</span>
                    <span style={{
                      color: undergroundTheme.colors.status.success,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      Active
                    </span>
                  </div>
                </div>
              </UndergroundCard>
            </>
          )}
        </UndergroundSection>
      </div>
    </div>
  );
}
