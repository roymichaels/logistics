import React from 'react';
import { Badge, Button, Section, Text } from '../atoms';
import { Card } from '../molecules';

export interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export interface OrdersPageTemplateProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  loading?: boolean;
  error?: string | null;
}

export function OrdersPageTemplate({
  orders,
  onOrderClick,
  loading = false,
  error = null,
}: OrdersPageTemplateProps) {
  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'success';
      case 'processing':
      case 'in_transit':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div>
      <Section spacing="lg">
        <Text variant="h1" weight="bold">
          My Orders
        </Text>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading orders...</Text>}
        {error && <Text color="error">{error}</Text>}
        {!loading && !error && orders.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Text variant="h3" color="secondary">
                No orders yet
              </Text>
              <Text variant="body" color="secondary" style={{ marginTop: '8px' }}>
                Start shopping to see your orders here
              </Text>
            </div>
          </Card>
        )}
        {!loading && !error && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => (
              <Card key={order.id} hoverable>
                <div
                  style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => onOrderClick(order)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <Text variant="h4" weight="semibold">
                        Order #{order.id.slice(0, 8)}
                      </Text>
                      <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <Text variant="small" color="secondary">
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text variant="h4" weight="bold">
                      ${order.total?.toFixed(2) || '0.00'}
                    </Text>
                    <Button size="sm" variant="ghost" onClick={(e) => {
                      e.stopPropagation();
                      onOrderClick(order);
                    }}>
                      View Details →
                    </Button>
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
