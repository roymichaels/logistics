import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Section } from '../components/atoms/Section';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { Badge } from '../components/atoms/Badge';
import { EmptyState } from '../components/molecules/EmptyState';
import { colors, spacing, borderRadius, shadows } from '../styles/design-system';

interface MyOrdersPageProps {
  dataStore?: any;
  onNavigate?: (dest: string) => void;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  created_at: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' as const, color: '#f59e0b' },
  confirmed: { label: 'Confirmed', variant: 'info' as const, color: '#3b82f6' },
  preparing: { label: 'Preparing', variant: 'info' as const, color: '#8b5cf6' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'info' as const, color: '#06b6d4' },
  delivered: { label: 'Delivered', variant: 'success' as const, color: '#10b981' },
  cancelled: { label: 'Cancelled', variant: 'error' as const, color: '#ef4444' },
};

export function MyOrdersPage({ dataStore, onNavigate }: MyOrdersPageProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      if (dataStore?.listOrders) {
        const ordersList = await dataStore.listOrders();
        setOrders(ordersList);
      } else {
        const storedOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        setOrders(storedOrders.reverse());
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    if (onNavigate) {
      onNavigate(`/store/orders/${orderId}`);
    } else {
      navigate(`/store/orders/${orderId}`);
    }
  };

  const handleBackToStore = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      navigate('/store/catalog');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <Text variant="h4">Loading orders...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      <Button
        variant="secondary"
        onClick={handleBackToStore}
        style={{ marginBottom: spacing.xl }}
      >
        ← Back to Store
      </Button>

      <Section
        title="My Orders"
        style={{
          marginBottom: spacing.xl,
        }}
      >
        {orders.length === 0 ? (
          <Card variant="outlined">
            <EmptyState
              variant="default"
              title="No orders yet"
              description="You haven't placed any orders. Start shopping to see your orders here!"
              action={{
                label: 'Start Shopping',
                onClick: handleBackToStore,
              }}
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <Card
                  key={order.id}
                  variant="outlined"
                  hoverable
                  onClick={() => handleOrderClick(order.id)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text variant="h4" style={{ marginBottom: spacing.xs }}>
                          Order #{order.order_number}
                        </Text>
                        <Text variant="small" color="secondary">
                          {formatDate(order.created_at)}
                        </Text>
                      </div>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>

                    <div
                      style={{
                        padding: spacing.md,
                        background: colors.background.secondary,
                        borderRadius: borderRadius.md,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <Text variant="small" color="secondary">
                          Items
                        </Text>
                        <Text variant="small" weight="semibold">
                          {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                        <Text variant="small" color="secondary">
                          Total Amount
                        </Text>
                        <Text variant="body" weight="bold" style={{ color: colors.brand.primary }}>
                          ₪{order.total_amount.toFixed(2)}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text variant="small" color="secondary">
                          Payment Method
                        </Text>
                        <Text variant="small" weight="semibold">
                          Cash on Delivery
                        </Text>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: spacing.xs,
                        flexWrap: 'wrap',
                        borderTop: `1px solid ${colors.border.primary}`,
                        paddingTop: spacing.md,
                      }}
                    >
                      {order.items.slice(0, 3).map((item, idx) => (
                        <Text key={idx} variant="small" color="secondary">
                          {item.product_name} ({item.quantity}x)
                        </Text>
                      ))}
                      {order.items.length > 3 && (
                        <Text variant="small" color="secondary" weight="semibold">
                          +{order.items.length - 3} more
                        </Text>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="small"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order.id);
                      }}
                    >
                      View Details →
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
