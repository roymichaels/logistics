import React, { useEffect } from 'react';
import { TrendingUp, Package, Users, DollarSign, ShoppingCart, Truck, BarChart3, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { PageContent } from '../components/molecules/PageContent';
import { Card } from '../components/molecules/Card';
import { ResponsiveGrid } from '../components/atoms/ResponsiveGrid';
import { Text } from '../components/atoms/Typography';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { colors, spacing } from '../styles/design-system';

function BusinessDashboardNewContent() {
  const { setTitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    setTitle('Business Dashboard');
  }, [setTitle]);

  const stats = [
    {
      label: 'Total Revenue',
      value: '$12,450',
      change: '+12.5%',
      icon: DollarSign,
      color: colors.status.success,
      trend: 'up',
    },
    {
      label: 'Orders',
      value: '245',
      change: '+8.2%',
      icon: ShoppingCart,
      color: colors.brand.primary,
      trend: 'up',
    },
    {
      label: 'Products',
      value: '87',
      change: '+5',
      icon: Package,
      color: colors.brand.secondary,
      trend: 'up',
    },
    {
      label: 'Active Drivers',
      value: '12',
      change: '+3',
      icon: Truck,
      color: colors.status.info,
      trend: 'up',
    },
  ];

  const quickActions = [
    { label: 'New Order', icon: ShoppingCart, action: () => nav.push('orders') },
    { label: 'Add Product', icon: Package, action: () => nav.push('products') },
    { label: 'Manage Inventory', icon: BarChart3, action: () => nav.push('inventory') },
    { label: 'View Reports', icon: TrendingUp, action: () => nav.push('reports') },
  ];

  const recentAlerts = [
    { message: 'Low stock alert: Product XYZ', severity: 'warning', time: '5 min ago' },
    { message: '3 orders pending delivery assignment', severity: 'info', time: '15 min ago' },
  ];

  return (
    <PageContent mobilePadding="md">
      {/* Stats Grid */}
      <ResponsiveGrid
        columns={{ mobile: 1, tablet: 2, desktop: 4, wide: 4 }}
        gap={isMobile ? 'md' : 'lg'}
        style={{ marginBottom: spacing.xl }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              style={{
                padding: isMobile ? spacing.md : spacing.lg,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.secondary}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
                <div
                  style={{
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    borderRadius: '50%',
                    background: `${stat.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={isMobile ? 20 : 24} color={stat.color} />
                </div>
                <Badge
                  label={stat.change}
                  variant={stat.trend === 'up' ? 'success' : 'error'}
                  size="sm"
                />
              </div>
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                {stat.label}
              </Text>
              <Text variant={isMobile ? 'xl' : '2xl'} weight="bold">
                {stat.value}
              </Text>
            </Card>
          );
        })}
      </ResponsiveGrid>

      {/* Quick Actions */}
      <div style={{ marginBottom: spacing.xl }}>
        <Text variant="h3" weight="bold" style={{ marginBottom: spacing.lg }}>
          Quick Actions
        </Text>
        <ResponsiveGrid
          columns={{ mobile: 2, tablet: 4, desktop: 4, wide: 4 }}
          gap={isMobile ? 'sm' : 'md'}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="secondary"
                onClick={action.action}
                style={{
                  height: isMobile ? '80px' : '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                }}
              >
                <Icon size={isMobile ? 20 : 24} />
                <Text variant="small" weight="medium" style={{ textAlign: 'center' }}>
                  {action.label}
                </Text>
              </Button>
            );
          })}
        </ResponsiveGrid>
      </div>

      {/* Recent Alerts */}
      <div>
        <Text variant="h3" weight="bold" style={{ marginBottom: spacing.lg }}>
          Recent Alerts
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {recentAlerts.map((alert, index) => (
            <Card
              key={index}
              style={{
                padding: isMobile ? spacing.md : spacing.lg,
                background: alert.severity === 'warning' ? colors.status.warningFaded : colors.status.infoFaded,
                border: `1px solid ${alert.severity === 'warning' ? colors.status.warning : colors.status.info}40`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
                <AlertCircle
                  size={isMobile ? 18 : 20}
                  color={alert.severity === 'warning' ? colors.status.warning : colors.status.info}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text variant={isMobile ? 'small' : 'body'} weight="medium" style={{ marginBottom: spacing.xs }}>
                    {alert.message}
                  </Text>
                  <Text variant="small" color="secondary">
                    {alert.time}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContent>
  );
}

export function BusinessDashboardNew(props: Record<string, unknown>) {
  return <BusinessDashboardNewContent {...props} />;
}

export default BusinessDashboardNew;
