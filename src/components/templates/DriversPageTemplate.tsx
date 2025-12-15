import React from 'react';
import { Badge, Button, Grid, Section, Text, Avatar } from '../atoms';
import { Card } from '../molecules';

export interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'busy';
  avatar?: string;
  rating?: number;
  deliveries?: number;
}

export interface DriversPageTemplateProps {
  drivers: Driver[];
  onDriverClick: (driver: Driver) => void;
  onAddDriver?: () => void;
  loading?: boolean;
  error?: string | null;
}

export function DriversPageTemplate({
  drivers,
  onDriverClick,
  onAddDriver,
  loading = false,
  error = null,
}: DriversPageTemplateProps) {
  const getStatusVariant = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'busy':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div>
      <Section spacing="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text variant="h1" weight="bold">
              Drivers
            </Text>
            <Text variant="body" color="secondary">
              Manage your delivery team
            </Text>
          </div>
          {onAddDriver && (
            <Button variant="primary" onClick={onAddDriver}>
              + Add Driver
            </Button>
          )}
        </div>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading drivers...</Text>}
        {error && <Text color="error">{error}</Text>}
        {!loading && !error && drivers.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Text variant="h3" color="secondary">
                No drivers found
              </Text>
              {onAddDriver && (
                <Button variant="primary" onClick={onAddDriver} style={{ marginTop: '16px' }}>
                  Add your first driver
                </Button>
              )}
            </div>
          </Card>
        )}
        {!loading && !error && drivers.length > 0 && (
          <Grid columns={3} gap="md" autoFit minItemWidth="300px">
            {drivers.map((driver) => (
              <Card key={driver.id} hoverable onClick={() => onDriverClick(driver)}>
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Avatar src={driver.avatar} alt={driver.name} size="md" />
                    <div style={{ flex: 1 }}>
                      <Text variant="h4" weight="semibold">
                        {driver.name}
                      </Text>
                      <Badge variant={getStatusVariant(driver.status)}>
                        {driver.status}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {driver.email && (
                      <Text variant="small" color="secondary">
                        {driver.email}
                      </Text>
                    )}
                    {driver.phone && (
                      <Text variant="small" color="secondary">
                        {driver.phone}
                      </Text>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #e5e7eb',
                    }}
                  >
                    {driver.rating && (
                      <div>
                        <Text variant="small" color="secondary">
                          Rating
                        </Text>
                        <Text variant="body" weight="semibold">
                          ⭐ {driver.rating.toFixed(1)}
                        </Text>
                      </div>
                    )}
                    {driver.deliveries !== undefined && (
                      <div>
                        <Text variant="small" color="secondary">
                          Deliveries
                        </Text>
                        <Text variant="body" weight="semibold">
                          {driver.deliveries}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Section>
    </div>
  );
}
