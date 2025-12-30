import React, { useEffect, useState } from 'react';
import { DashboardTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';

interface BusinessDashboardPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeDrivers: number;
  pendingOrders: number;
  revenueChange: number;
  ordersChange: number;
  driversChange: number;
}

export function BusinessDashboardPage({ dataStore, onNavigate }: BusinessDashboardPageProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    activeDrivers: 0,
    pendingOrders: 0,
    revenueChange: 0,
    ordersChange: 0,
    driversChange: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        setLoading(true);

        const orders = (await dataStore?.listOrders?.()) ?? [];
        const products = (await dataStore?.listProducts?.()) ?? [];
        const drivers = (await dataStore?.listDrivers?.()) ?? [];

        if (mounted) {
          const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
          const pendingOrders = orders.filter((o: any) =>
            ['new', 'confirmed', 'preparing'].includes(o.status)
          ).length;
          const activeDrivers = drivers.filter((d: any) => d.is_online).length;

          setMetrics({
            totalRevenue,
            totalOrders: orders.length,
            activeDrivers,
            pendingOrders,
            revenueChange: 12.5,
            ordersChange: 8.3,
            driversChange: 5.2,
          });

          setRecentOrders(orders.slice(0, 5));
          setTopProducts(products.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₪${metrics.totalRevenue.toFixed(2)}`,
      change: metrics.revenueChange,
      trend: 'up' as const,
      icon: '💰',
    },
    {
      label: 'Total Orders',
      value: metrics.totalOrders.toString(),
      change: metrics.ordersChange,
      trend: 'up' as const,
      icon: '📦',
    },
    {
      label: 'Active Drivers',
      value: metrics.activeDrivers.toString(),
      change: metrics.driversChange,
      trend: 'up' as const,
      icon: '🚗',
    },
    {
      label: 'Pending Orders',
      value: metrics.pendingOrders.toString(),
      icon: '⏳',
    },
  ];

  const quickActions = [
    {
      label: 'New Order',
      icon: '➕',
      onClick: () => onNavigate?.('/business/orders'),
      variant: 'primary' as const,
    },
    {
      label: 'Add Product',
      icon: '🏷️',
      onClick: () => onNavigate?.('/business/products'),
      variant: 'secondary' as const,
    },
    {
      label: 'Assign Driver',
      icon: '🚚',
      onClick: () => onNavigate?.('/business/drivers'),
      variant: 'secondary' as const,
    },
    {
      label: 'View Reports',
      icon: '📊',
      onClick: () => onNavigate?.('/business/reports'),
      variant: 'secondary' as const,
    },
  ];

  const recentActivity = recentOrders.map((order) => ({
    id: order.id,
    title: `Order #${order.id.slice(0, 8)}`,
    description: `${order.customer_name} - ₪${order.total_amount.toFixed(2)}`,
    timestamp: new Date(order.delivery_date || Date.now()).toLocaleString(),
    status: order.status,
    onClick: () => onNavigate?.(`/business/orders/${order.id}`),
  }));

  const widgets = [
    {
      title: 'Revenue Overview',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box
            style={{
              height: '200px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Typography variant="h1" style={{ color: 'white', marginBottom: '8px' }}>
              ₪{metrics.totalRevenue.toFixed(2)}
            </Typography>
            <Typography style={{ color: 'rgba(255,255,255,0.9)' }}>
              Total Revenue This Month
            </Typography>
            <Box style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
              <Box style={{ textAlign: 'center' }}>
                <Typography variant="h3" style={{ color: 'white' }}>
                  {metrics.totalOrders}
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Orders
                </Typography>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <Typography variant="h3" style={{ color: 'white' }}>
                  ₪{metrics.totalOrders > 0 ? (metrics.totalRevenue / metrics.totalOrders).toFixed(2) : '0.00'}
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Avg Order Value
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Top Products',
      content: (
        <Box style={{ padding: '12px' }}>
          {topProducts.length === 0 ? (
            <Box style={{ padding: '40px', textAlign: 'center' }}>
              <Typography color="secondary">No products yet</Typography>
            </Box>
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topProducts.map((product, index) => (
                <Box
                  key={product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                  }}
                >
                  <Box style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Box
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        backgroundColor: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}
                    >
                      #{index + 1}
                    </Box>
                    <Box>
                      <Typography weight="semibold">{product.name}</Typography>
                      <Typography variant="caption" color="secondary">
                        ₪{product.price}
                      </Typography>
                    </Box>
                  </Box>
                  <Badge variant="info">{product.stock_quantity || 0} in stock</Badge>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ),
    },
    {
      title: 'Order Status',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Pending</Typography>
              <Badge variant="warning">{metrics.pendingOrders}</Badge>
            </Box>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>In Progress</Typography>
              <Badge variant="primary">
                {recentOrders.filter((o) => o.status === 'out_for_delivery').length}
              </Badge>
            </Box>
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography>Delivered</Typography>
              <Badge variant="success">
                {recentOrders.filter((o) => o.status === 'delivered').length}
              </Badge>
            </Box>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onNavigate?.('/business/orders')}
              style={{ marginTop: '12px' }}
            >
              View All Orders
            </Button>
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <DashboardTemplate
      title="Business Dashboard"
      subtitle="Overview of your business performance"
      stats={statCards}
      quickActions={quickActions}
      recentActivity={recentActivity}
      widgets={widgets}
      loading={loading}
      actions={
        <Button variant="text" size="small">
          Refresh
        </Button>
      }
    />
  );
}
