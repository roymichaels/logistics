import React, { useState, useEffect } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundLoadingSpinner } from '../../components/underground/UndergroundLoadingSpinner';
import { UndergroundEmptyState } from '../../components/underground/UndergroundEmptyState';
import { getStatusBadgeStyle } from '../../utils/undergroundStyles';
import { StatusVariant } from '../../components/atoms/StatusBadge';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../hooks/useBusinessContext';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: StatusVariant;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
}

interface Activity {
  id: string;
  type: 'order' | 'customer' | 'contact';
  message: string;
  timestamp: string;
  metadata?: any;
}

type TimeRange = 'this_week' | 'this_month' | 'this_quarter' | 'this_year';

export function SalesDashboard() {
  const { user } = useAuth();
  const { currentBusinessId } = useBusinessContext();
  const [timeFilter, setTimeFilter] = useState<TimeRange>('this_month');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeLeads: 0,
    closedDeals: 0,
    conversionRate: 0
  });

  useEffect(() => {
    if (currentBusinessId) {
      loadSalesData();
    }
  }, [currentBusinessId, timeFilter]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'this_week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'this_month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'this_quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'this_year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  };

  const loadSalesData = async () => {
    if (!currentBusinessId) return;

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          customer_id,
          created_at,
          profiles:customer_id (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('business_id', currentBusinessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (ordersError) {
        logger.error('[SalesDashboard] Failed to fetch orders:', ordersError);
        return;
      }

      const completedOrders = orders?.filter(o => o.status === 'delivered' || o.status === 'completed') || [];
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

      const customerMap = new Map<string, Lead>();
      orders?.forEach(order => {
        const customerId = order.customer_id;
        const profile = order.profiles as any;

        if (customerId && profile) {
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: profile.name || 'Unknown Customer',
              email: profile.email || '',
              phone: profile.phone || '',
              status: 'active',
              totalSpent: 0,
              orderCount: 0,
              lastOrderDate: order.created_at
            });
          }

          const lead = customerMap.get(customerId)!;
          lead.orderCount++;
          if (order.status === 'delivered' || order.status === 'completed') {
            lead.totalSpent += Number(order.total_amount) || 0;
          }

          if (new Date(order.created_at) > new Date(lead.lastOrderDate)) {
            lead.lastOrderDate = order.created_at;
          }
        }
      });

      const topLeads = Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      const recentActivities: Activity[] = orders?.slice(0, 10).map(order => ({
        id: order.id,
        type: 'order' as const,
        message: `New order from ${(order.profiles as any)?.name || 'Unknown'} - $${Number(order.total_amount).toFixed(2)}`,
        timestamp: order.created_at,
        metadata: order
      })) || [];

      setLeads(topLeads);
      setActivities(recentActivities);
      setStats({
        totalRevenue,
        activeLeads: customerMap.size,
        closedDeals: completedOrders.length,
        conversionRate: customerMap.size > 0 ? (completedOrders.length / customerMap.size) * 100 : 0
      });

    } catch (error) {
      logger.error('[SalesDashboard] Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return '📦';
      case 'customer': return '👤';
      case 'contact': return '📞';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order': return undergroundTheme.colors.status.success;
      case 'customer': return undergroundTheme.colors.accent.primary;
      case 'contact': return undergroundTheme.colors.status.info;
      default: return undergroundTheme.colors.text.secondary;
    }
  };

  const salesStatsDisplay = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: '+18%',
      icon: '💰',
      accentColor: undergroundTheme.colors.status.success
    },
    {
      label: 'Active Customers',
      value: stats.activeLeads.toString(),
      change: `+${Math.floor(stats.activeLeads * 0.15)}`,
      icon: '📈',
      accentColor: undergroundTheme.colors.accent.primary
    },
    {
      label: 'Completed Orders',
      value: stats.closedDeals.toString(),
      change: `+${Math.floor(stats.closedDeals * 0.25)}`,
      icon: '✅',
      accentColor: undergroundTheme.colors.status.info
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(0)}%`,
      change: '+8%',
      icon: '🎯',
      accentColor: undergroundTheme.colors.status.warning
    },
  ];

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: undergroundTheme.spacing['3xl']
      }}>
        <div>
          <h1 style={{
            fontSize: undergroundTheme.typography.fontSize['4xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            margin: '0 0 8px 0',
            color: undergroundTheme.colors.text.primary,
            textShadow: undergroundTheme.shadows.glow.cyan
          }}>
            📊 Sales Dashboard
          </h1>
          <p style={{
            margin: 0,
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.lg
          }}>
            Track your sales performance and manage customers
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: undergroundTheme.spacing.sm,
          background: undergroundTheme.colors.glassmorphism.light,
          padding: undergroundTheme.spacing.xs,
          borderRadius: undergroundTheme.borderRadius.lg,
          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
        }}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeFilter(option.value)}
              style={{
                padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
                background: timeFilter === option.value
                  ? undergroundTheme.colors.gradient.accent
                  : 'transparent',
                border: 'none',
                borderRadius: undergroundTheme.borderRadius.md,
                color: timeFilter === option.value
                  ? undergroundTheme.colors.text.primary
                  : undergroundTheme.colors.text.secondary,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.normal,
                boxShadow: timeFilter === option.value ? undergroundTheme.shadows.glow.cyan : 'none'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['4xl']
      }}>
        {salesStatsDisplay.map((stat) => (
          <UndergroundStatCard
            key={stat.label}
            icon={<span style={{ fontSize: '32px' }}>{stat.icon}</span>}
            label={stat.label}
            value={stat.value}
            subtext={stat.change}
            accentColor={stat.accentColor}
            trend={{
              value: stat.change,
              direction: stat.change.startsWith('+') ? 'up' : 'down'
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: undergroundTheme.spacing['2xl']
      }}>
        <div>
          <UndergroundCard>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: undergroundTheme.spacing['2xl']
            }}>
              <h2 style={{
                margin: 0,
                fontSize: undergroundTheme.typography.fontSize['2xl'],
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                Top Customers
              </h2>
              <UndergroundButton
                variant="primary"
                onClick={() => logger.info('[SalesDashboard] Create manual order')}
              >
                + New Order
              </UndergroundButton>
            </div>

            {leads.length === 0 ? (
              <UndergroundEmptyState
                icon="👥"
                title="No customers yet"
                description="Orders from customers will appear here"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
                {leads.map((lead) => (
                  <UndergroundCard
                    key={lead.id}
                    variant="light"
                    hover
                    onClick={() => logger.info('[SalesDashboard] View customer:', lead.id)}
                    style={{ padding: undergroundTheme.spacing.lg }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: undergroundTheme.spacing.md
                    }}>
                      <div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.lg,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: undergroundTheme.colors.text.primary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          {lead.name}
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.secondary
                        }}>
                          {lead.email}
                        </div>
                      </div>
                      <div style={{
                        ...getStatusBadgeStyle(lead.status),
                        textTransform: 'capitalize'
                      }}>
                        {lead.orderCount} orders
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: undergroundTheme.typography.fontSize.xl,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.accent.primary
                      }}>
                        {formatCurrency(lead.totalSpent)}
                      </span>
                      <span style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        Last order: {formatDate(lead.lastOrderDate)}
                      </span>
                    </div>
                  </UndergroundCard>
                ))}
              </div>
            )}
          </UndergroundCard>
        </div>

        <div>
          <UndergroundCard>
            <h2 style={{
              margin: `0 0 ${undergroundTheme.spacing['2xl']} 0`,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              Recent Activity
            </h2>

            {activities.length === 0 ? (
              <UndergroundEmptyState
                icon="📋"
                title="No activity yet"
                description="Recent orders and activities will appear here"
              />
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: undergroundTheme.spacing.md,
                  marginBottom: undergroundTheme.spacing.lg
                }}>
                  {activities.map((activity) => (
                    <UndergroundCard
                      key={activity.id}
                      variant="light"
                      hover
                      style={{
                        padding: undergroundTheme.spacing.lg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: undergroundTheme.spacing.lg
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: undergroundTheme.borderRadius.md,
                        background: `${getActivityColor(activity.type)}20`,
                        fontSize: '24px',
                        flexShrink: 0
                      }}>
                        {getActivityIcon(activity.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.base,
                          color: undergroundTheme.colors.text.primary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          {activity.message}
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.xs,
                          color: undergroundTheme.colors.text.tertiary
                        }}>
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </UndergroundCard>
                  ))}
                </div>

                <UndergroundButton
                  variant="secondary"
                  fullWidth
                  onClick={() => logger.info('[SalesDashboard] View all activities')}
                >
                  View All Activity
                </UndergroundButton>
              </>
            )}
          </UndergroundCard>
        </div>
      </div>
    </div>
  );
}
