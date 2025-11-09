/**
 * Business Owner Dashboard - Refactored
 * Financial-focused dashboard using unified design system
 */

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { fetchBusinessMetrics } from '../services/metrics';
import { BusinessBottomNav } from './BusinessBottomNav';
import { useLanguage } from '../context/LanguageContext';
import { DashboardHeader, MetricCard, MetricGrid, Section, LoadingState, EmptyState } from './dashboard';
import { theme, colors, spacing, typography, borderRadius, components, getStatusBadgeStyle } from '../styles/theme';

interface FinancialMetrics {
  revenue_today: number;
  revenue_month: number;
  costs_month: number;
  profit_month: number;
  profit_margin: number;
  orders_today: number;
  orders_month: number;
  average_order_value: number;
}

interface OwnershipInfo {
  owner_name: string;
  ownership_percentage: number;
  profit_share_percentage: number;
  estimated_monthly_share: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  orders_completed: number;
  revenue_generated: number;
  active_status: string;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  assigned_driver_name?: string;
}

interface BusinessOwnerDashboardProps {
  businessId: string;
  userId: string;
}

export function BusinessOwnerDashboard({ businessId, userId }: BusinessOwnerDashboardProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [ownership, setOwnership] = useState<OwnershipInfo[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const { formatCurrency, isRTL } = useLanguage();

  // Handle case where businessId is missing
  if (!businessId) {
    return (
      <div style={theme.components.pageContainer}>
        <EmptyState
          icon="🏢"
          title="ברוכים הבאים בעל העסק!"
          description="כדי להתחיל, עליך לבחור עסק או ליצור עסק חדש. לחץ על הכפתור למטה כדי לעבור לעמוד הניהול של העסקים שלך."
          action={{
            label: 'עבור לעמוד עסקים',
            onClick: () => { window.location.hash = '#businesses'; }
          }}
        />
      </div>
    );
  }

  useEffect(() => {
    loadDashboardData();

    // Real-time updates with error handling
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('Supabase not available for real-time subscriptions');
      return;
    }

    let subscription: any = null;

    try {
      subscription = supabase
        .channel(`business-${businessId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`
        }, (payload) => {
          console.log('Real-time order update received:', payload);
          loadDashboardData();
        })
        .subscribe((status: string, error?: Error) => {
          if (error) {
            console.error('Subscription error:', error);
          } else {
            console.log('Subscription status:', status);
          }
        });
    } catch (error) {
      console.error('Failed to set up real-time subscription:', error);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
    };
  }, [businessId]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const supabase = getSupabase();
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Load metrics with fallback
      try {
        const kpi = await fetchBusinessMetrics(businessId);

        const revenueMonth = kpi.revenue_month;
        const costsMonth = revenueMonth * 0.6;
        const profitMonth = revenueMonth - costsMonth;
        const profitMargin = revenueMonth > 0 ? (profitMonth / revenueMonth) * 100 : 0;

        setMetrics({
          revenue_today: kpi.revenue_today,
          revenue_month: revenueMonth,
          costs_month: costsMonth,
          profit_month: profitMonth,
          profit_margin: profitMargin,
          orders_today: kpi.orders_today,
          orders_month: kpi.orders_month,
          average_order_value: kpi.average_order_value,
        });
      } catch (error) {
        console.error('Failed to load metrics:', error);
        setMetrics({
          revenue_today: 0,
          revenue_month: 0,
          costs_month: 0,
          profit_month: 0,
          profit_margin: 0,
          orders_today: 0,
          orders_month: 0,
          average_order_value: 0,
        });
      }

      // Load ownership information with fallback
      try {
        const { data: ownershipData } = await supabase
          .from('user_business_roles')
          .select(`
            ownership_percentage,
            commission_percentage,
            users (name)
          `)
          .eq('business_id', businessId)
          .eq('is_active', true)
          .gt('ownership_percentage', 0);

        const owners: OwnershipInfo[] = (ownershipData || []).map((item: any) => ({
          owner_name: item.users?.name || 'Unknown',
          ownership_percentage: item.ownership_percentage || 0,
          profit_share_percentage: item.commission_percentage || item.ownership_percentage || 0,
          estimated_monthly_share: ((metrics?.profit_month || 0) * ((item.ownership_percentage || 0) / 100)),
        }));

        setOwnership(owners);
      } catch (error) {
        console.error('Failed to load ownership data:', error);
        setOwnership([]);
      }

      // Load team members with fallback
      try {
        const { data: teamData } = await supabase
          .from('user_business_roles')
          .select(`
            user_id,
            users (id, name),
            roles (label)
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        const teamMembers: TeamMember[] = await Promise.all(
          (teamData || []).map(async (member: any) => {
            try {
              const { data: orderStats } = await supabase
                .from('orders')
                .select('id, total_amount')
                .eq('business_id', businessId)
                .eq('created_by', member.user_id)
                .gte('created_at', firstDayOfMonth);

              return {
                id: member.user_id,
                name: member.users?.name || 'Unknown',
                role: member.roles?.label || 'Unknown',
                orders_completed: orderStats?.length || 0,
                revenue_generated: orderStats?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
                active_status: 'active',
              };
            } catch (error) {
              console.error('Failed to load stats for member:', member.user_id, error);
              return {
                id: member.user_id,
                name: member.users?.name || 'Unknown',
                role: member.roles?.label || 'Unknown',
                orders_completed: 0,
                revenue_generated: 0,
                active_status: 'active',
              };
            }
          })
        );

        setTeam(teamMembers);
      } catch (error) {
        console.error('Failed to load team data:', error);
        setTeam([]);
      }

      // Load recent orders with fallback
      try {
        const { data: ordersRecent } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            total_amount,
            status,
            created_at,
            assigned_driver_user:assigned_driver (name)
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(10);

        const recent: RecentOrder[] = (ordersRecent || []).map((order: any) => ({
          id: order.id,
          customer_name: order.customer_name,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          assigned_driver_name: order.assigned_driver_user?.name,
        }));

        setRecentOrders(recent);
      } catch (error) {
        console.error('Failed to load recent orders:', error);
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState variant="page" />;
  }

  const handleExportReport = () => {
    console.log('Export report clicked');
  };

  const handleManageTeam = () => {
    console.log('Manage team clicked');
  };

  return (
    <>
      <div style={{
        ...theme.components.pageContainer,
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Dashboard Header */}
          <DashboardHeader
            title="Business Dashboard"
            subtitle="Financial overview and operational metrics"
            role="business_owner"
            roleLabel="Business Owner"
            icon="💼"
            actions={
              <>
                <button style={{
                  ...components.button.secondary,
                  fontSize: typography.fontSize.sm,
                }}>
                  Export Report
                </button>
                <button style={{
                  ...components.button.primary,
                  fontSize: typography.fontSize.sm,
                }}>
                  Manage Team
                </button>
              </>
            }
          />

          {/* Financial Overview Metrics */}
          <MetricGrid columns={4}>
            <MetricCard
              label="Profit (Month)"
              value={`₪${metrics?.profit_month.toLocaleString()}`}
              subtitle={`${metrics?.profit_margin.toFixed(1)}% margin`}
              icon="💎"
              variant="success"
              size="medium"
            />
            <MetricCard
              label="Costs (Month)"
              value={`₪${metrics?.costs_month.toLocaleString()}`}
              subtitle="Operating expenses"
              icon="📊"
              variant="default"
              size="medium"
            />
            <MetricCard
              label="Revenue (Month)"
              value={`₪${metrics?.revenue_month.toLocaleString()}`}
              subtitle={`₪${metrics?.revenue_today.toLocaleString()} today`}
              icon="💰"
              variant="primary"
              size="medium"
            />
            <MetricCard
              label="Orders (Month)"
              value={`${metrics?.orders_month}`}
              subtitle={`₪${metrics?.average_order_value.toFixed(0)} avg`}
              icon="📦"
              variant="default"
              size="medium"
            />
          </MetricGrid>

          {/* Ownership Distribution */}
          {ownership.length > 0 && (
            <Section title="Ownership Distribution" subtitle="Equity and profit sharing breakdown">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: spacing.lg,
              }}>
                {ownership.map((owner, index) => (
                  <div
                    key={index}
                    style={{
                      padding: spacing.xl,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.lg,
                      background: colors.background.secondary,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      marginBottom: spacing.lg,
                      paddingBottom: spacing.lg,
                      borderBottom: `1px solid ${colors.border.secondary}`,
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme.gradients.primary,
                        borderRadius: '50%',
                        fontSize: '24px',
                      }}>
                        👤
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: typography.fontSize.lg,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.text.primary,
                          marginBottom: spacing.xs,
                        }}>
                          {owner.owner_name}
                        </div>
                        <div style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                        }}>
                          {owner.ownership_percentage}% ownership
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: spacing.sm,
                        background: colors.background.tertiary,
                        borderRadius: borderRadius.md,
                      }}>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                          Profit Share:
                        </span>
                        <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                          {owner.profit_share_percentage}%
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: spacing.sm,
                        background: colors.status.successFaded,
                        border: `1px solid ${colors.status.success}`,
                        borderRadius: borderRadius.md,
                      }}>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                          Est. Monthly Share:
                        </span>
                        <span style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.status.success }}>
                          ₪{owner.estimated_monthly_share.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Team Performance */}
          <Section title="Team Performance" subtitle="Member contributions and activity">
            {team.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No team members"
                description="Team members will appear here after they are invited to the system"
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      background: colors.background.tertiary,
                      borderBottom: `2px solid ${colors.border.primary}`,
                    }}>
                      <th style={{
                        textAlign: 'left',
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Name</th>
                      <th style={{
                        textAlign: 'left',
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Role</th>
                      <th style={{
                        textAlign: 'left',
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Orders</th>
                      <th style={{
                        textAlign: 'left',
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Revenue Generated</th>
                      <th style={{
                        textAlign: 'left',
                        padding: spacing.md,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map(member => (
                      <tr
                        key={member.id}
                        style={{
                          borderBottom: `1px solid ${colors.border.secondary}`,
                        }}
                      >
                        <td style={{
                          padding: `${spacing.lg} ${spacing.md}`,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.primary,
                          fontWeight: typography.fontWeight.semibold,
                        }}>
                          {member.name}
                        </td>
                        <td style={{ padding: `${spacing.lg} ${spacing.md}` }}>
                          <span style={{
                            ...components.badge.base,
                            ...components.badge.info,
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{
                          padding: `${spacing.lg} ${spacing.md}`,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.primary,
                        }}>
                          {member.orders_completed}
                        </td>
                        <td style={{
                          padding: `${spacing.lg} ${spacing.md}`,
                          fontSize: typography.fontSize.sm,
                          color: colors.status.success,
                          fontWeight: typography.fontWeight.bold,
                        }}>
                          ₪{member.revenue_generated.toLocaleString()}
                        </td>
                        <td style={{ padding: `${spacing.lg} ${spacing.md}` }}>
                          <span style={getStatusBadgeStyle(member.active_status)}>
                            {member.active_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Recent Orders */}
          <Section title="Recent Orders" subtitle="Latest transactions and deliveries">
            {recentOrders.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No orders yet"
                description="Orders will appear here as they are created"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {recentOrders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      padding: spacing.lg,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.lg,
                      transition: 'all 200ms ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.brand.primary;
                      e.currentTarget.style.boxShadow = theme.shadows.md;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.border.primary;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: spacing.sm,
                    }}>
                      <div style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}>
                        {order.customer_name}
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.status.success,
                      }}>
                        ₪{order.total_amount.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: spacing.md,
                      alignItems: 'center',
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}>
                      <span style={getStatusBadgeStyle(order.status)}>
                        {order.status}
                      </span>
                      {order.assigned_driver_name && (
                        <span>🚗 {order.assigned_driver_name}</span>
                      )}
                      <span>{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <BusinessBottomNav activePage={activePage} onNavigate={setActivePage} />
    </>
  );
}
