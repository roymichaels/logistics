/**
 * Infrastructure Owner Dashboard - Frontend-Only
 * Global control panel using unified design system
 * NO BACKEND - Uses LocalDataStore only
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { CreateBusinessModal } from './CreateBusinessModal';
import { DataStore, User } from '../data/types';
import { logger } from '../lib/logger';
import { DashboardHeader, MetricCard, MetricGrid, Section, LoadingState, EmptyState } from './dashboard';
import { theme, colors, spacing, typography, borderRadius, components, getStatusBadgeStyle } from '../styles/theme';

interface InfrastructureOwnerDashboardProps {
  dataStore: DataStore;
  user: User | null;
  onNavigate: (page: string) => void;
}

interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  totalOrders: number;
  activeDrivers: number;
  pendingAllocations: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface BusinessSummary {
  id: string;
  name: string;
  active: boolean;
  total_orders: number;
  revenue_today: number;
  active_drivers: number;
  pending_orders: number;
}

interface RecentActivity {
  id: string;
  event_type: string;
  actor_name: string;
  business_name: string;
  description: string;
  created_at: string;
  severity: string;
}

export function InfrastructureOwnerDashboard({ dataStore, user, onNavigate }: InfrastructureOwnerDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const loadingRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      logger.debug('[InfraOwnerDashboard] Loading dashboard data');

      // Load businesses from LocalDataStore
      const businessesData = await (dataStore.listBusinesses?.() || Promise.resolve([]));
      const ordersData = await (dataStore.listOrders?.({}) || Promise.resolve([]));
      const driversData = await (dataStore.listDrivers?.() || Promise.resolve([]));

      // Calculate metrics
      const activeBusinesses = businessesData.filter((b: any) => b.active);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = ordersData.filter((o: any) =>
        new Date(o.created_at) >= today
      );

      const totalRevenue = todayOrders.reduce((sum: number, o: any) =>
        sum + (o.total_amount || 0), 0
      );

      const activeDrivers = driversData.filter((d: any) =>
        d.is_available || d.status === 'online'
      );

      const pendingOrders = ordersData.filter((o: any) =>
        o.status === 'pending' || o.status === 'created'
      );

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (pendingOrders.length > 20) systemHealth = 'warning';
      if (pendingOrders.length > 50) systemHealth = 'critical';

      setMetrics({
        totalBusinesses: businessesData.length,
        activeBusinesses: activeBusinesses.length,
        totalRevenue,
        totalOrders: ordersData.length,
        activeDrivers: activeDrivers.length,
        pendingAllocations: pendingOrders.length,
        systemHealth,
      });

      // Build business summaries
      const businessSummaries: BusinessSummary[] = businessesData.map((biz: any) => {
        const businessOrders = ordersData.filter((o: any) => o.business_id === biz.id);
        const todayBusinessOrders = businessOrders.filter((o: any) =>
          new Date(o.created_at) >= today
        );
        const pendingBusinessOrders = businessOrders.filter((o: any) =>
          o.status === 'pending' || o.status === 'created'
        );
        const businessDrivers = driversData.filter((d: any) =>
          d.business_id === biz.id && (d.is_available || d.status === 'online')
        );

        return {
          id: biz.id,
          name: biz.name,
          active: biz.active,
          total_orders: businessOrders.length,
          revenue_today: todayBusinessOrders.reduce((sum: number, o: any) =>
            sum + (o.total_amount || 0), 0
          ),
          active_drivers: businessDrivers.length,
          pending_orders: pendingBusinessOrders.length,
        };
      });

      setBusinesses(businessSummaries);

      // Generate recent activity from orders (mock audit log)
      const recentOrders = ordersData
        .sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 10);

      const activities: RecentActivity[] = recentOrders.map((order: any) => {
        const business = businessesData.find((b: any) => b.id === order.business_id);
        return {
          id: order.id,
          event_type: 'order_created',
          actor_name: order.customer_name || 'Customer',
          business_name: business?.name || 'Unknown Business',
          description: `created order #${order.id.slice(0, 8)}`,
          created_at: order.created_at,
          severity: order.status === 'cancelled' ? 'warning' : 'info',
        };
      });

      setRecentActivity(activities);
      logger.debug('[InfraOwnerDashboard] Dashboard data loaded successfully');
    } catch (error) {
      logger.error('[InfraOwnerDashboard] Failed to load dashboard data', error);
      // Set empty states on error
      setMetrics({
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalRevenue: 0,
        totalOrders: 0,
        activeDrivers: 0,
        pendingAllocations: 0,
        systemHealth: 'healthy',
      });
      setBusinesses([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [dataStore]);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to data changes
    const unsubscribers: Array<() => void> = [];

    if (dataStore.subscribe) {
      try {
        const unsubBusinesses = dataStore.subscribe('businesses', () => {
          logger.debug('[InfraOwnerDashboard] Businesses updated');
          loadDashboardData();
        });
        unsubscribers.push(unsubBusinesses);

        const unsubOrders = dataStore.subscribe('orders', () => {
          logger.debug('[InfraOwnerDashboard] Orders updated');
          loadDashboardData();
        });
        unsubscribers.push(unsubOrders);
      } catch (error) {
        logger.warn('[InfraOwnerDashboard] Subscriptions not available', error);
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [loadDashboardData, dataStore]);

  const getSystemHealthColor = useMemo(() => {
    if (metrics?.systemHealth === 'healthy') return colors.status.success;
    if (metrics?.systemHealth === 'warning') return colors.status.warning;
    return colors.status.error;
  }, [metrics?.systemHealth]);

  const getSystemHealthLabel = useMemo(() => {
    if (metrics?.systemHealth === 'healthy') return 'תקין';
    if (metrics?.systemHealth === 'warning') return 'אזהרה';
    return 'קריטי';
  }, [metrics?.systemHealth]);

  if (loading) {
    return <LoadingState variant="page" />;
  }

  return (
    <div style={theme.components.pageContainer}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Dashboard Header */}
        <DashboardHeader
          title="מרכז בקרת תשתית"
          subtitle="פיקוח וניהול פלטפורמה גלובלית"
          role="infrastructure_owner"
          roleLabel="Infrastructure Owner"
          icon="🏗️"
          variant="gradient"
          actions={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: borderRadius.full,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getSystemHealthColor,
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.white,
              }}>
                {getSystemHealthLabel}
              </span>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.6; }
                }
              `}</style>
            </div>
          }
        />

        {/* Platform Metrics */}
        <MetricGrid columns={3}>
          <MetricCard
            label="Total Businesses"
            value={metrics?.totalBusinesses || 0}
            subtitle={`${metrics?.activeBusinesses || 0} active`}
            icon="🏢"
            variant="primary"
          />
          <MetricCard
            label="Revenue Today"
            value={`₪${(metrics?.totalRevenue || 0).toLocaleString()}`}
            subtitle="Across all businesses"
            icon="💰"
            variant="success"
          />
          <MetricCard
            label="Total Orders"
            value={metrics?.totalOrders || 0}
            subtitle="Platform-wide"
            icon="📦"
            variant="default"
          />
          <MetricCard
            label="Active Drivers"
            value={metrics?.activeDrivers || 0}
            subtitle="Infrastructure + Businesses"
            icon="🚗"
            variant="default"
          />
          <MetricCard
            label="Pending Allocations"
            value={metrics?.pendingAllocations || 0}
            subtitle="Requires approval"
            icon="⚠️"
            variant="warning"
          />
        </MetricGrid>

        {/* Business Overview */}
        <Section
          title="סקירת עסקים"
          actions={
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  ...components.button.primary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                + צור עסק חדש
              </button>
              <button
                onClick={() => onNavigate('businesses')}
                style={{
                  ...components.button.secondary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                ראה הכל
              </button>
            </>
          }
        >
          {businesses.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No businesses yet"
              description="Create your first business to get started"
              action={{
                label: '+ Create Business',
                onClick: () => setShowCreateModal(true),
              }}
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: spacing.lg,
            }}>
              {businesses.slice(0, 6).map(business => (
                <div
                  key={business.id}
                  style={{
                    padding: spacing.lg,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.lg,
                    background: colors.background.secondary,
                    opacity: business.active ? 1 : 0.6,
                    transition: 'all 200ms ease',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.md,
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: typography.fontSize.lg,
                      color: colors.text.primary,
                      fontWeight: typography.fontWeight.semibold,
                    }}>
                      {business.name}
                    </h3>
                    <span style={getStatusBadgeStyle(business.active ? 'active' : 'inactive')}>
                      {business.active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: spacing.md,
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.primary,
                      }}>
                        {business.total_orders}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}>
                        הזמנות
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.status.success,
                      }}>
                        ₪{business.revenue_today.toLocaleString()}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}>
                        היום
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.brand.primary,
                      }}>
                        {business.active_drivers}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}>
                        נהגים
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: spacing.xs,
                    }}>
                      <span style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.status.warning,
                      }}>
                        {business.pending_orders}
                      </span>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}>
                        ממתינים
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent System Activity */}
        <Section
          title="פעילות מערכת אחרונה"
          actions={
            <button
              onClick={() => onNavigate('logs')}
              style={{
                ...components.button.secondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              ראה יומן ביקורת
            </button>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No recent activity"
              description="System activity will appear here"
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}>
              {recentActivity.map(activity => {
                const getSeverityColor = () => {
                  if (activity.severity === 'critical') return colors.status.error;
                  if (activity.severity === 'warning') return colors.status.warning;
                  return colors.brand.primary;
                };

                const getSeverityIcon = () => {
                  if (activity.severity === 'critical') return '🔴';
                  if (activity.severity === 'warning') return '⚠️';
                  return 'ℹ️';
                };

                return (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderLeft: `3px solid ${getSeverityColor()}`,
                      background: colors.background.tertiary,
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <div style={{ fontSize: '20px' }}>
                      {getSeverityIcon()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}>
                        <strong>{activity.actor_name}</strong> {activity.description}
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                      }}>
                        {activity.business_name} • {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <CreateBusinessModal
          dataStore={dataStore}
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
