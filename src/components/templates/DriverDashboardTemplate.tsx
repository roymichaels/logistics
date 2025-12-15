import React from 'react';
import { Badge, Button, Grid, Section, Text } from '../atoms';
import { Card } from '../molecules';

export interface Delivery {
  id: string;
  customer_name: string;
  address: string;
  status: 'pending' | 'in_transit' | 'delivered';
  items_count: number;
  total: number;
  created_at: string;
}

export interface DriverStats {
  todayDeliveries: number;
  totalEarnings: number;
  rating: number;
  completedDeliveries: number;
}

export interface DriverDashboardTemplateProps {
  stats: DriverStats;
  activeDeliveries: Delivery[];
  onDeliveryClick: (delivery: Delivery) => void;
  onStartDelivery?: (delivery: Delivery) => void;
  onCompleteDelivery?: (delivery: Delivery) => void;
  loading?: boolean;
}

export function DriverDashboardTemplate({
  stats,
  activeDeliveries,
  onDeliveryClick,
  onStartDelivery,
  onCompleteDelivery,
  loading = false,
}: DriverDashboardTemplateProps) {
  const getStatusVariant = (status: string): 'warning' | 'primary' | 'success' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_transit':
        return 'primary';
      case 'delivered':
        return 'success';
      default:
        return 'warning';
    }
  };

  return (
    <div>
      <Section spacing="lg">
        <Text variant="h1" weight="bold">
          Driver Dashboard
        </Text>
        <Text variant="body" color="secondary">
          Your delivery overview
        </Text>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading stats...</Text>}
        {!loading && (
          <Grid columns={4} gap="md" autoFit minItemWidth="180px">
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="small" color="secondary">
                  Today's Deliveries
                </Text>
                <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                  {stats.todayDeliveries}
                </Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="small" color="secondary">
                  Total Earnings
                </Text>
                <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                  ${stats.totalEarnings.toFixed(2)}
                </Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="small" color="secondary">
                  Rating
                </Text>
                <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                  ⭐ {stats.rating.toFixed(1)}
                </Text>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="small" color="secondary">
                  Completed
                </Text>
                <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                  {stats.completedDeliveries}
                </Text>
              </div>
            </Card>
          </Grid>
        )}
      </Section>

      <Section spacing="lg">
        <Text variant="h2" weight="bold" style={{ marginBottom: '16px' }}>
          Active Deliveries
        </Text>
        {activeDeliveries.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Text variant="h3" color="secondary">
                No active deliveries
              </Text>
              <Text variant="body" color="secondary" style={{ marginTop: '8px' }}>
                Check back soon for new delivery assignments
              </Text>
            </div>
          </Card>
        )}
        {activeDeliveries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeDeliveries.map((delivery) => (
              <Card key={delivery.id} hoverable>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <Text variant="h4" weight="semibold">
                        {delivery.customer_name}
                      </Text>
                      <Text variant="body" color="secondary" style={{ marginTop: '4px' }}>
                        {delivery.address}
                      </Text>
                    </div>
                    <Badge variant={getStatusVariant(delivery.status)}>
                      {delivery.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <Text variant="small" color="secondary">
                      Items: {delivery.items_count}
                    </Text>
                    <Text variant="small" color="secondary">
                      Total: ${delivery.total.toFixed(2)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => onDeliveryClick(delivery)}
                    >
                      View Details
                    </Button>
                    {delivery.status === 'pending' && onStartDelivery && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onStartDelivery(delivery)}
                      >
                        Start
                      </Button>
                    )}
                    {delivery.status === 'in_transit' && onCompleteDelivery && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => onCompleteDelivery(delivery)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
