import React, { useEffect, useState } from 'react';
import { DashboardTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { logger } from '@/lib/logger';

interface DriverDashboardPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface DriverMetrics {
  todayEarnings: number;
  weekEarnings: number;
  completedToday: number;
  activeDeliveries: number;
  rating: number;
  totalDeliveries: number;
  earningsChange: number;
  deliveriesChange: number;
}

export function DriverDashboardPage({ dataStore, onNavigate }: DriverDashboardPageProps) {
  const [metrics, setMetrics] = useState<DriverMetrics>({
    todayEarnings: 0,
    weekEarnings: 0,
    completedToday: 0,
    activeDeliveries: 0,
    rating: 4.8,
    totalDeliveries: 0,
    earningsChange: 18.5,
    deliveriesChange: 12.3,
  });
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverDashboard();
  }, [dataStore]);

  const loadDriverDashboard = async () => {
    let mounted = true;
    try {
      setLoading(true);

      const orders = (await dataStore?.listOrders?.()) ?? [];

      if (mounted) {
        const active = orders.filter((o: any) =>
          ['confirmed', 'ready', 'out_for_delivery'].includes(o.status)
        );
        const completed = orders.filter((o: any) => o.status === 'delivered');
        const todayCompleted = completed.slice(0, 8);

        const todayEarnings = todayCompleted.reduce(
          (sum: number, order: any) => sum + (order.delivery_fee || order.total_amount * 0.15),
          0
        );

        setMetrics({
          todayEarnings,
          weekEarnings: todayEarnings * 5.2,
          completedToday: todayCompleted.length,
          activeDeliveries: active.length,
          rating: 4.8,
          totalDeliveries: completed.length,
          earningsChange: 18.5,
          deliveriesChange: 12.3,
        });

        setActiveOrders(active.slice(0, 3));
        setRecentDeliveries(todayCompleted.slice(0, 5));
      }
    } catch (error) {
      logger.error('[DriverDashboardPage] Failed to load driver dashboard:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const statCards = [
    {
      label: "Today's Earnings",
      value: `₪${metrics.todayEarnings.toFixed(2)}`,
      change: metrics.earningsChange,
      trend: 'up' as const,
      icon: '💰',
    },
    {
      label: 'Completed Today',
      value: metrics.completedToday.toString(),
      change: metrics.deliveriesChange,
      trend: 'up' as const,
      icon: '✅',
    },
    {
      label: 'Active Deliveries',
      value: metrics.activeDeliveries.toString(),
      icon: '🚚',
    },
    {
      label: 'Driver Rating',
      value: `${metrics.rating.toFixed(1)} ⭐`,
      icon: '⭐',
    },
  ];

  const quickActions = [
    {
      label: 'Find Orders',
      icon: '🔍',
      onClick: () => onNavigate?.('/driver/marketplace'),
      variant: 'primary' as const,
    },
    {
      label: 'View Routes',
      icon: '🗺️',
      onClick: () => onNavigate?.('/driver/routes'),
      variant: 'secondary' as const,
    },
    {
      label: 'Delivery History',
      icon: '📋',
      onClick: () => onNavigate?.('/driver/history'),
      variant: 'secondary' as const,
    },
    {
      label: 'My Profile',
      icon: '👤',
      onClick: () => onNavigate?.('/driver/profile'),
      variant: 'secondary' as const,
    },
  ];

  const recentActivity = recentDeliveries.map((order) => ({
    id: order.id,
    title: `Delivered Order #${order.id.slice(0, 8)}`,
    description: `${order.customer_name} - ₪${((order.total_amount || 0) * 0.15).toFixed(2)} earned`,
    timestamp: new Date(order.updated_at || Date.now()).toLocaleTimeString(),
    status: 'completed',
    onClick: () => console.log('View delivery:', order.id),
  }));

  const widgets = [
    {
      title: 'Weekly Earnings',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box
            style={{
              height: '200px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Typography variant="h1" style={{ color: 'white', marginBottom: '8px' }}>
              ₪{metrics.weekEarnings.toFixed(2)}
            </Typography>
            <Typography style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>
              This Week
            </Typography>
            <Box style={{ display: 'flex', gap: '24px' }}>
              <Box style={{ textAlign: 'center' }}>
                <Typography variant="h3" style={{ color: 'white' }}>
                  ₪{metrics.todayEarnings.toFixed(2)}
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Today
                </Typography>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <Typography variant="h3" style={{ color: 'white' }}>
                  ₪{(metrics.weekEarnings / 5.2).toFixed(2)}
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Daily Avg
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Active Deliveries',
      content: (
        <Box style={{ padding: '12px' }}>
          {activeOrders.length === 0 ? (
            <Box style={{ padding: '40px', textAlign: 'center' }}>
              <Typography color="secondary">No active deliveries</Typography>
              <Button
                variant="primary"
                size="small"
                style={{ marginTop: '12px' }}
                onClick={() => onNavigate?.('/driver/marketplace')}
              >
                Find Orders
              </Button>
            </Box>
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeOrders.map((order) => (
                <Box
                  key={order.id}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '6px',
                    borderLeft: '4px solid #3b82f6',
                  }}
                >
                  <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Typography weight="semibold">#{order.id.slice(0, 8)}</Typography>
                    <Badge variant="primary">{order.status}</Badge>
                  </Box>
                  <Typography variant="small" color="secondary">
                    {order.customer_name}
                  </Typography>
                  <Typography variant="caption" color="secondary">
                    {order.delivery_address || 'Address pending'}
                  </Typography>
                </Box>
              ))}
              <Button
                variant="secondary"
                size="small"
                fullWidth
                onClick={() => onNavigate?.('/driver/routes')}
              >
                View Routes
              </Button>
            </Box>
          )}
        </Box>
      ),
    },
    {
      title: 'Performance',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Typography variant="small">On-Time Delivery</Typography>
                <Typography variant="small" weight="bold">95%</Typography>
              </Box>
              <Box
                style={{
                  height: '6px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    height: '100%',
                    width: '95%',
                    backgroundColor: '#10b981',
                    borderRadius: '3px',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Typography variant="small">Customer Rating</Typography>
                <Typography variant="small" weight="bold">{metrics.rating}/5.0</Typography>
              </Box>
              <Box
                style={{
                  height: '6px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    height: '100%',
                    width: `${(metrics.rating / 5) * 100}%`,
                    backgroundColor: '#f59e0b',
                    borderRadius: '3px',
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Typography variant="small">Acceptance Rate</Typography>
                <Typography variant="small" weight="bold">88%</Typography>
              </Box>
              <Box
                style={{
                  height: '6px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    height: '100%',
                    width: '88%',
                    backgroundColor: '#3b82f6',
                    borderRadius: '3px',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <DashboardTemplate
      title="Driver Dashboard"
      subtitle={`Total Deliveries: ${metrics.totalDeliveries}`}
      stats={statCards}
      quickActions={quickActions}
      recentActivity={recentActivity}
      widgets={widgets}
      loading={loading}
      actions={
        <Button variant="text" size="small" onClick={loadDriverDashboard}>
          Refresh
        </Button>
      }
    />
  );
}
