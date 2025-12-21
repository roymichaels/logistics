import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Section } from '../components/atoms/Section';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { Badge } from '../components/atoms/Badge';
import { colors, spacing, borderRadius } from '../styles/design-system';

interface OrderDetailPageProps {
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
  pending: { label: 'Pending', variant: 'warning' as const, icon: '⏳', description: 'Your order is being processed' },
  confirmed: { label: 'Confirmed', variant: 'info' as const, icon: '✓', description: 'Order has been confirmed' },
  preparing: { label: 'Preparing', variant: 'info' as const, icon: '📦', description: 'Your order is being prepared' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'info' as const, icon: '🚚', description: 'Driver is on the way' },
  delivered: { label: 'Delivered', variant: 'success' as const, icon: '✓', description: 'Order has been delivered' },
  cancelled: { label: 'Cancelled', variant: 'error' as const, icon: '✗', description: 'Order was cancelled' },
};

const STATUS_TIMELINE = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export function OrderDetailPage({ dataStore, onNavigate }: OrderDetailPageProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      if (dataStore?.getOrder && orderId) {
        const orderData = await dataStore.getOrder(orderId);
        setOrder(orderData);
      } else {
        const storedOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        const foundOrder = storedOrders.find((o: Order) => o.id === orderId);
        setOrder(foundOrder || null);
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOrders = () => {
    if (onNavigate) {
      onNavigate('/store/orders');
    } else {
      navigate('/store/orders');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <Text variant="h4">Loading order...</Text>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <Text variant="h3" style={{ marginBottom: spacing.lg }}>
          Order not found
        </Text>
        <Button variant="primary" onClick={handleBackToOrders}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const currentStatusIndex = STATUS_TIMELINE.indexOf(order.status);

  return (
    <div style={{ padding: spacing.xl, maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      <Button
        variant="secondary"
        onClick={handleBackToOrders}
        style={{ marginBottom: spacing.xl }}
      >
        ← Back to Orders
      </Button>

      <Section
        title={`Order #${order.order_number}`}
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <div>
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                Order Date
              </Text>
              <Text weight="semibold">{formatDate(order.created_at)}</Text>
            </div>
            <Badge variant={statusConfig.variant} size="lg">
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>

          <div
            style={{
              padding: spacing.lg,
              background: colors.background.secondary,
              borderRadius: borderRadius.md,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: spacing.sm }}>{statusConfig.icon}</div>
            <Text variant="h4" style={{ marginBottom: spacing.xs }}>
              {statusConfig.label}
            </Text>
            <Text variant="body" color="secondary">
              {statusConfig.description}
            </Text>
          </div>
        </Card>

        {order.status !== 'cancelled' && (
          <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: spacing.lg }}>
              Order Timeline
            </Text>

            <div style={{ position: 'relative' }}>
              {STATUS_TIMELINE.filter((s) => s !== 'cancelled').map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = status === order.status;
                const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];

                return (
                  <div
                    key={status}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: index < STATUS_TIMELINE.length - 2 ? spacing.lg : 0,
                      position: 'relative',
                    }}
                  >
                    {index < STATUS_TIMELINE.length - 2 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '15px',
                          top: '32px',
                          width: '2px',
                          height: '100%',
                          background: isCompleted ? colors.brand.primary : colors.border.primary,
                        }}
                      />
                    )}

                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isCompleted ? colors.brand.primary : colors.background.secondary,
                        border: `2px solid ${isCompleted ? colors.brand.primary : colors.border.primary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      {isCompleted && (
                        <span style={{ color: colors.white, fontSize: '14px' }}>✓</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <Text
                        weight={isCurrent ? 'bold' : 'semibold'}
                        style={{
                          color: isCompleted ? colors.text.primary : colors.text.secondary,
                          marginBottom: spacing.xs,
                        }}
                      >
                        {config.label}
                      </Text>
                      <Text
                        variant="small"
                        color="secondary"
                        style={{
                          color: isCompleted ? colors.text.secondary : colors.text.tertiary,
                        }}
                      >
                        {config.description}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
          <Text variant="h4" style={{ marginBottom: spacing.lg }}>
            Order Items
          </Text>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {order.items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing.md,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.md,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Text weight="semibold">{item.product_name}</Text>
                  <Text variant="small" color="secondary">
                    Quantity: {item.quantity} × ₪{item.price.toFixed(2)}
                  </Text>
                </div>
                <Text weight="bold">₪{(item.price * item.quantity).toFixed(2)}</Text>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: spacing.lg,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.border.primary}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text color="secondary">Subtotal</Text>
              <Text weight="semibold">₪{order.subtotal.toFixed(2)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text color="secondary">Shipping</Text>
              <Text weight="semibold">
                {order.shipping_cost === 0 ? 'FREE' : `₪${order.shipping_cost.toFixed(2)}`}
              </Text>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: spacing.md,
                borderTop: `1px solid ${colors.border.primary}`,
              }}
            >
              <Text variant="h4">Total</Text>
              <Text variant="h4" style={{ color: colors.brand.primary }}>
                ₪{order.total_amount.toFixed(2)}
              </Text>
            </div>
          </div>
        </Card>

        <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
          <Text variant="h4" style={{ marginBottom: spacing.lg }}>
            Delivery Information
          </Text>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                Customer Name
              </Text>
              <Text weight="semibold">{order.customer_name}</Text>
            </div>

            <div>
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                Phone Number
              </Text>
              <Text weight="semibold">{order.customer_phone}</Text>
            </div>

            <div>
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                Delivery Address
              </Text>
              <Text weight="semibold">{order.delivery_address}</Text>
            </div>

            {order.notes && (
              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                  Delivery Notes
                </Text>
                <Text>{order.notes}</Text>
              </div>
            )}
          </div>
        </Card>

        <Card variant="outlined">
          <Text variant="h4" style={{ marginBottom: spacing.lg }}>
            Payment Information
          </Text>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              background: colors.background.secondary,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '32px' }}>💵</div>
            <div style={{ flex: 1 }}>
              <Text weight="bold">Cash on Delivery</Text>
              <Text variant="small" color="secondary">
                Pay ₪{order.total_amount.toFixed(2)} when you receive your order
              </Text>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          <Text variant="small" color="secondary">
            Need help? Contact our support team
          </Text>
        </div>
      </Section>
    </div>
  );
}
