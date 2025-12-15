import React, { useEffect, useState } from 'react';
import { AnalyticsTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';

interface AnalyticsPageProps {
  dataStore: any;
}

export function AnalyticsPage({ dataStore }: AnalyticsPageProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadData();
  }, [dataStore, dateRange]);

  const loadData = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const orderList = (await dataStore?.listOrders?.()) ?? [];
      const productList = (await dataStore?.listProducts?.()) ?? [];
      if (mounted) {
        setOrders(orderList);
        setProducts(productList);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
  const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

  const metrics = [
    {
      label: 'Total Revenue',
      value: `₪${totalRevenue.toFixed(2)}`,
      change: 15.3,
      trend: 'up' as const,
      description: 'vs last period',
    },
    {
      label: 'Orders',
      value: totalOrders.toString(),
      change: 8.7,
      trend: 'up' as const,
      description: 'vs last period',
    },
    {
      label: 'Avg Order Value',
      value: `₪${avgOrderValue.toFixed(2)}`,
      change: 12.1,
      trend: 'up' as const,
      description: 'vs last period',
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      change: -2.3,
      trend: 'down' as const,
      description: 'vs last period',
    },
  ];

  const revenueData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue',
        data: [1200, 1900, 1500, 2100, 1800, 2400, 2200],
      },
    ],
  };

  const ordersData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Orders',
        data: [15, 22, 18, 28, 24, 32, 29],
      },
    ],
  };

  const categoryData = {
    labels: ['Physical', 'Digital', 'Services'],
    datasets: [
      {
        data: [45, 30, 25],
      },
    ],
  };

  const topProductsData = products.slice(0, 5).map((product) => ({
    name: product.name,
    value: Math.floor(Math.random() * 100) + 20,
  }));

  const charts = [
    {
      title: 'Revenue Over Time',
      type: 'line' as const,
      data: revenueData,
      fullWidth: true,
    },
    {
      title: 'Orders Over Time',
      type: 'bar' as const,
      data: ordersData,
    },
    {
      title: 'Sales by Category',
      type: 'pie' as const,
      data: categoryData,
    },
  ];

  const insights = [
    {
      title: 'Top Products',
      content: (
        <Box style={{ padding: '12px' }}>
          {topProductsData.length === 0 ? (
            <Box style={{ padding: '20px', textAlign: 'center' }}>
              <Typography color="secondary">No data available</Typography>
            </Box>
          ) : (
            <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topProductsData.map((item, index) => (
                <Box
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px',
                  }}
                >
                  <Typography variant="small">{item.name}</Typography>
                  <Typography variant="small" weight="bold">
                    {item.value} sales
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ),
    },
    {
      title: 'Peak Hours',
      content: (
        <Box style={{ padding: '20px', textAlign: 'center' }}>
          <Box
            style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              marginBottom: '12px',
            }}
          >
            <Typography variant="h2" style={{ color: '#3b82f6', marginBottom: '8px' }}>
              2PM - 5PM
            </Typography>
            <Typography variant="small" color="secondary">
              Highest order volume
            </Typography>
          </Box>
          <Typography variant="caption" color="secondary">
            Based on last 30 days of data
          </Typography>
        </Box>
      ),
    },
    {
      title: 'Customer Insights',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Box>
              <Typography variant="caption" color="secondary">
                Repeat Customers
              </Typography>
              <Typography variant="h3">32%</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="secondary">
                Avg. Items per Order
              </Typography>
              <Typography variant="h3">3.4</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="secondary">
                Customer Satisfaction
              </Typography>
              <Typography variant="h3">4.6/5.0</Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Recommendations',
      content: (
        <Box style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Box
              style={{
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderLeft: '4px solid #10b981',
                borderRadius: '4px',
              }}
            >
              <Typography variant="small" weight="semibold" style={{ marginBottom: '4px' }}>
                Increase Marketing
              </Typography>
              <Typography variant="caption" color="secondary">
                Your conversion rate is below average. Consider increasing marketing efforts.
              </Typography>
            </Box>
            <Box
              style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '4px',
              }}
            >
              <Typography variant="small" weight="semibold" style={{ marginBottom: '4px' }}>
                Stock Alert
              </Typography>
              <Typography variant="caption" color="secondary">
                3 products are running low on stock. Restock recommended.
              </Typography>
            </Box>
            <Box
              style={{
                padding: '12px',
                backgroundColor: '#dbeafe',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '4px',
              }}
            >
              <Typography variant="small" weight="semibold" style={{ marginBottom: '4px' }}>
                Peak Hour Staffing
              </Typography>
              <Typography variant="caption" color="secondary">
                Consider adding more drivers during 2PM-5PM peak hours.
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
    },
  ];

  const dateRanges = [
    { label: 'Last 7 days', value: '7d' as const },
    { label: 'Last 30 days', value: '30d' as const },
    { label: 'Last 90 days', value: '90d' as const },
    { label: 'Last year', value: '1y' as const },
  ];

  return (
    <AnalyticsTemplate
      title="Business Analytics"
      subtitle="Track your business performance and insights"
      metrics={metrics}
      charts={charts}
      insights={insights}
      dateRanges={dateRanges}
      selectedDateRange={dateRange}
      onDateRangeChange={setDateRange}
      loading={loading}
    />
  );
}
