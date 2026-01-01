import React from 'react';
import { Order } from '../domain/orders/entities';
import { DashboardStats } from '../components/organisms/DashboardStats';
import { OrdersTable } from '../components/organisms/OrdersTable';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ContentCard } from '../components/layout/ContentCard';
import { Button } from '../components/atoms/Button';
import { Typography } from '../components/atoms/Typography';
import { TELEGRAM_THEME } from '../styles/telegramTheme';

export interface DashboardViewProps {
  metrics: {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  metricsLoading: boolean;
  recentOrders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  onRefresh: () => void;
  onNavigate: (page: string) => void;
  userRole: string;
}

export function DashboardView({
  metrics,
  metricsLoading,
  recentOrders,
  ordersLoading,
  ordersError,
  onRefresh,
  onNavigate,
  userRole,
}: DashboardViewProps) {
  const stats = [
    {
      label: 'Total Orders',
      value: metrics.totalOrders,
      icon: 'package',
      iconColor: TELEGRAM_THEME.colors.accent.primary,
      onClick: () => onNavigate('orders'),
    },
    {
      label: 'Pending',
      value: metrics.pendingOrders,
      icon: 'clock',
      iconColor: TELEGRAM_THEME.colors.status.warning,
      onClick: () => onNavigate('orders?status=pending'),
    },
    {
      label: 'Active',
      value: metrics.activeOrders,
      icon: 'truck',
      iconColor: TELEGRAM_THEME.colors.status.info,
      onClick: () => onNavigate('orders?status=active'),
    },
    {
      label: 'Completed',
      value: metrics.completedOrders,
      icon: 'check-circle',
      iconColor: TELEGRAM_THEME.colors.status.success,
      onClick: () => onNavigate('orders?status=completed'),
    },
    {
      label: 'Total Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      icon: 'dollar-sign',
      iconColor: TELEGRAM_THEME.colors.status.success,
      onClick: () => onNavigate('reports'),
    },
    {
      label: 'Avg Order Value',
      value: `$${metrics.averageOrderValue.toFixed(2)}`,
      icon: 'trending-up',
      iconColor: TELEGRAM_THEME.colors.accent.primary,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        actions={
          <Button
            onClick={onRefresh}
            variant="secondary"
            leftIcon={<span>🔄</span>}
          >
            Refresh
          </Button>
        }
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: TELEGRAM_THEME.spacing.lg,
        }}
      >
        <DashboardStats stats={stats} loading={metricsLoading} columns={3} />

        <ContentCard>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: TELEGRAM_THEME.spacing.md,
            }}
          >
            <Typography variant="h3" weight="bold">
              Recent Orders
            </Typography>

            <Button
              onClick={() => onNavigate('orders')}
              variant="ghost"
              size="sm"
            >
              View All
            </Button>
          </div>

          <OrdersTable
            orders={recentOrders}
            loading={ordersLoading}
            error={ordersError}
            onOrderClick={(order) => onNavigate(`orders/${order.id}`)}
            emptyMessage="No recent orders"
            compact
          />
        </ContentCard>
      </div>
    </PageContainer>
  );
}
