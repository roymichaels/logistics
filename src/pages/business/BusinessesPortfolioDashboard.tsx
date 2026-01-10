import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiBusinessCapability } from '../../hooks/useMultiBusinessCapability';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import {
  UndergroundHeader,
  UndergroundSection,
  UndergroundCard,
  UndergroundStatCard,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
} from '../../components/underground';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface BusinessMetrics {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  activeProducts: number;
  activeDrivers: number;
}

export default function BusinessesPortfolioDashboard() {
  const navigate = useNavigate();
  const { isMultiBusinessOwner, ownedBusinesses, loading: capabilityLoading } = useMultiBusinessCapability();
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isMultiBusinessOwner || capabilityLoading) return;

    async function fetchPortfolioMetrics() {
      try {
        setLoading(true);

        const metricsPromises = ownedBusinesses.map(async (business) => {
          const [ordersResult, productsResult, driversResult] = await Promise.all([
            supabase
              .from('orders')
              .select('id, total_amount', { count: 'exact' })
              .eq('business_id', business.id),
            supabase
              .from('products')
              .select('id', { count: 'exact' })
              .eq('business_id', business.id)
              .eq('status', 'active'),
            supabase
              .from('driver_profiles')
              .select('id', { count: 'exact' })
              .eq('business_id', business.id)
              .eq('status', 'active'),
          ]);

          const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

          return {
            businessId: business.id,
            businessName: business.name,
            totalOrders: ordersResult.count || 0,
            totalRevenue,
            activeProducts: productsResult.count || 0,
            activeDrivers: driversResult.count || 0,
          };
        });

        const metrics = await Promise.all(metricsPromises);
        setBusinessMetrics(metrics);

        logger.info('[BusinessesPortfolioDashboard] Portfolio metrics loaded', {
          businessCount: metrics.length,
        });
      } catch (error) {
        logger.error('[BusinessesPortfolioDashboard] Failed to fetch portfolio metrics', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolioMetrics();
  }, [isMultiBusinessOwner, ownedBusinesses, capabilityLoading]);

  if (capabilityLoading || loading) {
    return (
      <div style={{
        ...undergroundTheme.components.page,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  if (!isMultiBusinessOwner) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundEmptyState
          title="Multi-Business Portfolio"
          message="You need to own 2 or more businesses to access the portfolio dashboard."
          action={{
            label: 'View My Business',
            onClick: () => navigate('/business/dashboard'),
          }}
        />
      </div>
    );
  }

  const aggregatedMetrics = {
    totalBusinesses: businessMetrics.length,
    totalOrders: businessMetrics.reduce((sum, m) => sum + m.totalOrders, 0),
    totalRevenue: businessMetrics.reduce((sum, m) => sum + m.totalRevenue, 0),
    totalProducts: businessMetrics.reduce((sum, m) => sum + m.activeProducts, 0),
    totalDrivers: businessMetrics.reduce((sum, m) => sum + m.activeDrivers, 0),
  };

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        title="Business Portfolio"
        subtitle="Multi-Business Overview & Analytics"
        actions={[
          <UndergroundButton
            key="create"
            variant="primary"
            onClick={() => navigate('/business/businesses?action=create')}
          >
            Create New Business
          </UndergroundButton>,
        ]}
      />

      <UndergroundSection title="Portfolio Overview">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: undergroundTheme.spacing['2xl'],
        }}>
          <UndergroundStatCard
            label="Total Businesses"
            value={aggregatedMetrics.totalBusinesses}
            icon="🏢"
            trend={{ value: 0, isPositive: true }}
          />
          <UndergroundStatCard
            label="Total Orders"
            value={aggregatedMetrics.totalOrders}
            icon="📦"
            trend={{ value: 0, isPositive: true }}
          />
          <UndergroundStatCard
            label="Total Revenue"
            value={`$${aggregatedMetrics.totalRevenue.toLocaleString()}`}
            icon="💰"
            trend={{ value: 0, isPositive: true }}
          />
          <UndergroundStatCard
            label="Active Products"
            value={aggregatedMetrics.totalProducts}
            icon="🛍️"
            trend={{ value: 0, isPositive: true }}
          />
          <UndergroundStatCard
            label="Active Drivers"
            value={aggregatedMetrics.totalDrivers}
            icon="🚗"
            trend={{ value: 0, isPositive: true }}
          />
        </div>
      </UndergroundSection>

      <UndergroundSection title="Business Performance">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: undergroundTheme.spacing['2xl'],
        }}>
          {businessMetrics.map((metrics) => (
            <UndergroundCard
              key={metrics.businessId}
              hover
              onClick={() => navigate(`/business/dashboard?businessId=${metrics.businessId}`)}
            >
              <div style={{ marginBottom: undergroundTheme.spacing.lg }}>
                <h3 style={{
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary,
                  marginBottom: undergroundTheme.spacing.sm,
                }}>
                  {metrics.businessName}
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: undergroundTheme.spacing.md,
              }}>
                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}>
                    Orders
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.accent.primary,
                  }}>
                    {metrics.totalOrders}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}>
                    Revenue
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.status.success,
                  }}>
                    ${metrics.totalRevenue.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}>
                    Products
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.medium,
                    color: undergroundTheme.colors.text.secondary,
                  }}>
                    {metrics.activeProducts}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                  }}>
                    Drivers
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.medium,
                    color: undergroundTheme.colors.text.secondary,
                  }}>
                    {metrics.activeDrivers}
                  </div>
                </div>
              </div>
            </UndergroundCard>
          ))}
        </div>
      </UndergroundSection>
    </div>
  );
}
