/**
 * Infrastructure Owner Dashboard - Refactored
 * Global control panel using unified design system
 */

import React, { useEffect, useState, useRef } from 'react';
import { getSupabase, isSupabaseInitialized } from '../lib/supabaseClient';
import { CreateBusinessModal } from './CreateBusinessModal';
import { DataStore, User } from '../data/types';
import { fetchInfrastructureOverview, fetchBusinessMetrics } from '../services/metrics';
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
  const [isSystemReady, setIsSystemReady] = useState(false);
  const loadingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!isSupabaseInitialized()) {
      const checkInterval = setInterval(() => {
        if (isSupabaseInitialized()) {
          clearInterval(checkInterval);
          setIsSystemReady(true);
          loadDashboardData();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        setLoading(false);
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    setIsSystemReady(true);
    loadDashboardData();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  async function loadDashboardData() {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      if (!isSupabaseInitialized()) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const supabase = getSupabase();
      const overview = await fetchInfrastructureOverview();

      setMetrics({
        totalBusinesses: overview.total_businesses,
        activeBusinesses: overview.active_businesses,
        totalRevenue: overview.revenue_today,
        totalOrders: overview.total_orders_30_days,
        activeDrivers: overview.active_drivers,
        pendingAllocations: overview.pending_allocations,
        systemHealth: overview.system_health,
      });

      const { data: businessRows, error: businessRowsError } = await supabase
        .from('businesses')
        .select('id, name, active')
        .order('name', { ascending: true });

      if (businessRowsError || !businessRows) {
        setBusinesses([]);
      } else {
        const businessMetrics = await Promise.all(
          businessRows.map(async (biz: any) => {
            try {
              const metrics = await fetchBusinessMetrics(biz.id);
              return {
                id: biz.id,
                name: biz.name,
                active: biz.active,
                total_orders: metrics.orders_month,
                revenue_today: metrics.revenue_today,
                active_drivers: metrics.active_drivers,
                pending_orders: metrics.orders_in_progress,
              } as BusinessSummary;
            } catch (err) {
              logger.warn('Failed to load metrics for business', biz.id, err);
              return {
                id: biz.id,
                name: biz.name,
                active: biz.active,
                total_orders: 0,
                revenue_today: 0,
                active_drivers: 0,
                pending_orders: 0,
              } as BusinessSummary;
            }
          })
        );

        setBusinesses(businessMetrics);
      }

      const { data: activityData, error: auditError } = await supabase
        .from('system_audit_log')
        .select('id, event_type, action, business_id, created_at, severity, actor_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditError) {
        setRecentActivity([]);
      } else {
        const activities: RecentActivity[] = await Promise.all(
          (activityData || []).map(async (activity: any) => {
            const { data: actor } = await supabase
              .from('users')
              .select('name')
              .eq('id', activity.actor_id)
              .maybeSingle();

            let businessName = 'מערכת';
            if (activity.business_id) {
              const { data: business } = await supabase
                .from('businesses')
                .select('name')
                .eq('id', activity.business_id)
                .maybeSingle();
              businessName = business?.name || 'לא ידוע';
            }

            return {
              id: activity.id,
              event_type: activity.event_type,
              actor_name: actor?.name || 'לא ידוע',
              business_name: businessName,
              description: activity.action || activity.event_type,
              created_at: activity.created_at,
              severity: activity.severity || 'info',
            };
          })
        );

        setRecentActivity(activities);
      }

      if (!subscriptionRef.current && isSupabaseInitialized()) {
        try {
          const subscription = supabase
            .channel('infra-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => loadDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadDashboardData())
            .subscribe();
          subscriptionRef.current = subscription;
        } catch (error) {
          logger.error('Failed to set up subscription', error);
        }
      }
    } catch (error) {
      logger.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (loading) {
    return <LoadingState variant="page" />;
  }

  const getSystemHealthColor = () => {
    if (metrics?.systemHealth === 'healthy') return colors.status.success;
    if (metrics?.systemHealth === 'warning') return colors.status.warning;
    return colors.status.error;
  };

  const getSystemHealthLabel = () => {
    if (metrics?.systemHealth === 'healthy') return 'תקין';
    if (metrics?.systemHealth === 'warning') return 'אזהרה';
    return 'קריטי';
  };

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
                background: getSystemHealthColor(),
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.white,
              }}>
                {getSystemHealthLabel()}
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
            value={`₪${metrics?.totalRevenue.toLocaleString()}`}
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
                onClick={() => {
                  if (!isSystemReady) return;
                  setShowCreateModal(true);
                }}
                disabled={!isSystemReady}
                style={{
                  ...components.button.primary,
                  fontSize: typography.fontSize.sm,
                  opacity: isSystemReady ? 1 : 0.6,
                  cursor: isSystemReady ? 'pointer' : 'not-allowed',
                }}
                title={isSystemReady ? undefined : 'המערכת בתהליך אתחול...'}
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
            <button style={{
              ...components.button.secondary,
              fontSize: typography.fontSize.sm,
            }}>
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
