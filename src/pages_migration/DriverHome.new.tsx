import React, { useEffect, useState } from 'react';
import { Package, MapPin, DollarSign, Clock, CheckCircle, Navigation } from 'lucide-react';
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
import { colors, spacing, responsive } from '../styles/design-system';

function DriverHomeNewContent() {
  const { setTitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const { isMobile } = useBreakpoint();
  const [isOnline, setIsOnline] = useState(true);

  const deliveries = sandbox.active ? sandbox.sandbox.deliveries : [];

  useEffect(() => {
    setTitle('Driver Dashboard');
  }, [setTitle]);

  const stats = [
    {
      label: "Today's Earnings",
      value: '$145.50',
      icon: DollarSign,
      color: colors.status.success,
    },
    {
      label: 'Completed',
      value: '12',
      icon: CheckCircle,
      color: colors.brand.primary,
    },
    {
      label: 'Pending',
      value: '3',
      icon: Clock,
      color: colors.status.warning,
    },
    {
      label: 'Distance',
      value: '45 km',
      icon: Navigation,
      color: colors.status.info,
    },
  ];

  return (
    <PageContent mobilePadding="md">
      {/* Status Toggle */}
      <Card
        style={{
          padding: isMobile ? spacing.lg : spacing.xl,
          marginBottom: spacing.xl,
          background: isOnline
            ? `linear-gradient(135deg, ${colors.status.successFaded}, ${colors.status.success}40)`
            : `linear-gradient(135deg, ${colors.background.secondary}, ${colors.background.tertiary})`,
          border: `2px solid ${isOnline ? colors.status.success : colors.border.secondary}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <div>
            <Text variant={isMobile ? 'body' : 'h3'} weight="bold" style={{ marginBottom: spacing.xs }}>
              Status: {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text variant="small" color="secondary">
              {isOnline ? 'Available for deliveries' : 'Not accepting deliveries'}
            </Text>
          </div>
          <div
            style={{
              width: isMobile ? 16 : 20,
              height: isMobile ? 16 : 20,
              borderRadius: '50%',
              background: isOnline ? colors.status.success : colors.text.secondary,
              boxShadow: isOnline ? `0 0 12px ${colors.status.success}` : 'none',
              flexShrink: 0,
            }}
          />
        </div>
        <Button
          variant={isOnline ? 'secondary' : 'primary'}
          onClick={() => setIsOnline(!isOnline)}
          fullWidth
          style={{
            ...responsive.touchTarget,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 600,
          }}
        >
          {isOnline ? 'Go Offline' : 'Go Online'}
        </Button>
      </Card>

      {/* Stats Grid */}
      <ResponsiveGrid
        columns={{ mobile: 2, tablet: 4, desktop: 4, wide: 4 }}
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
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: isMobile ? 40 : 48,
                  height: isMobile ? 40 : 48,
                  borderRadius: '50%',
                  background: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: spacing.md,
                }}
              >
                <Icon size={isMobile ? 20 : 24} color={stat.color} />
              </div>
              <Text variant={isMobile ? 'lg' : 'xl'} weight="bold" style={{ marginBottom: spacing.xs }}>
                {stat.value}
              </Text>
              <Text variant="small" color="secondary">
                {stat.label}
              </Text>
            </Card>
          );
        })}
      </ResponsiveGrid>

      {/* Current Delivery */}
      <div style={{ marginBottom: spacing.xl }}>
        <Text variant="h3" weight="bold" style={{ marginBottom: spacing.lg }}>
          Current Delivery
        </Text>
        {deliveries && deliveries.length > 0 ? (
          <Card
            style={{
              padding: isMobile ? spacing.lg : spacing.xl,
              background: colors.brand.primaryFaded,
              border: `2px solid ${colors.brand.primary}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg }}>
              <div
                style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  borderRadius: '50%',
                  background: colors.brand.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Package size={isMobile ? 24 : 28} color={colors.white} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  <Text variant={isMobile ? 'body' : 'h4'} weight="bold">
                    Order #{deliveries[0].id}
                  </Text>
                  <Badge label={deliveries[0].status} variant="warning" size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
                  <MapPin size={14} color={colors.text.secondary} />
                  <Text variant="small" color="secondary">
                    2.5 km away
                  </Text>
                </div>
              </div>
            </div>
            <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2, wide: 2 }} gap="sm">
              <Button
                variant="primary"
                onClick={() => nav.push('delivery', { id: deliveries[0].id })}
                style={{
                  ...responsive.touchTarget,
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 600,
                }}
              >
                <Navigation size={isMobile ? 18 : 20} style={{ marginRight: spacing.xs }} />
                Navigate
              </Button>
              <Button
                variant="secondary"
                onClick={() => nav.push('delivery', { id: deliveries[0].id })}
                style={{
                  ...responsive.touchTarget,
                  fontSize: isMobile ? '16px' : '18px',
                }}
              >
                View Details
              </Button>
            </ResponsiveGrid>
          </Card>
        ) : (
          <Card
            style={{
              padding: isMobile ? spacing.xl : '48px',
              textAlign: 'center',
            }}
          >
            <Package
              size={isMobile ? 48 : 64}
              color={colors.text.secondary}
              style={{ margin: '0 auto', marginBottom: spacing.lg, opacity: 0.5 }}
            />
            <Text variant={isMobile ? 'body' : 'lg'} weight="semibold" style={{ marginBottom: spacing.sm }}>
              No active delivery
            </Text>
            <Text variant="small" color="secondary">
              {isOnline ? 'Waiting for new orders...' : 'Go online to accept deliveries'}
            </Text>
          </Card>
        )}
      </div>

      {/* Upcoming Deliveries */}
      <div>
        <Text variant="h3" weight="bold" style={{ marginBottom: spacing.lg }}>
          Upcoming Deliveries
        </Text>
        {deliveries && deliveries.length > 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {deliveries.slice(1, 4).map((delivery: any) => (
              <Card
                key={delivery.id}
                hoverable
                interactive
                onClick={() => nav.push('delivery', { id: delivery.id })}
                style={{
                  padding: isMobile ? spacing.md : spacing.lg,
                  cursor: 'pointer',
                  ...responsive.touchTarget,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <div
                    style={{
                      width: isMobile ? 40 : 48,
                      height: isMobile ? 40 : 48,
                      borderRadius: '50%',
                      background: colors.background.tertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Package size={isMobile ? 18 : 20} color={colors.text.primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant={isMobile ? 'small' : 'body'} weight="semibold" style={{ marginBottom: spacing.xs }}>
                      Order #{delivery.id}
                    </Text>
                    <Text variant="small" color="secondary">
                      {delivery.status}
                    </Text>
                  </div>
                  <Badge label="Pending" variant="default" size="sm" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card
            style={{
              padding: isMobile ? spacing.lg : spacing.xl,
              textAlign: 'center',
            }}
          >
            <Text variant="body" color="secondary">
              No upcoming deliveries
            </Text>
          </Card>
        )}
      </div>
    </PageContent>
  );
}

export function DriverHomeNew(props: Record<string, unknown>) {
  return <DriverHomeNewContent {...props} />;
}

export default DriverHomeNew;
