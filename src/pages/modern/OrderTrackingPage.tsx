import React, { useEffect, useState } from 'react';
import { DetailPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import type { Order } from '@/data/types';

interface OrderTrackingPageProps {
  orderId: string;
  dataStore: any;
  onBack?: () => void;
  onCancelOrder?: (orderId: string) => void;
  onContactDriver?: (driverId: string) => void;
}

export function OrderTrackingPage({
  orderId,
  dataStore,
  onBack,
  onCancelOrder,
  onContactDriver,
}: OrderTrackingPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadOrder() {
      try {
        setLoading(true);
        const data = await dataStore?.getOrder?.(orderId);
        if (mounted && data) {
          setOrder(data);
        }
      } catch (error) {
        console.error('Failed to load order:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadOrder();
    return () => {
      mounted = false;
    };
  }, [orderId, dataStore]);

  if (loading) {
    return (
      <Box style={{ padding: '40px', textAlign: 'center' }}>
        <Typography>Loading order...</Typography>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box style={{ padding: '40px', textAlign: 'center' }}>
        <Typography>Order not found</Typography>
        <Button onClick={onBack} style={{ marginTop: '16px' }}>
          Back to Orders
        </Button>
      </Box>
    );
  }

  const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'new':
        return 'info';
      case 'confirmed':
      case 'preparing':
        return 'warning';
      case 'ready':
      case 'out_for_delivery':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOrderTimeline = () => {
    const timeline = [];

    if (order.delivery_date) {
      timeline.push({
        label: 'Order Placed',
        date: new Date(order.delivery_date),
        completed: true,
      });
    }

    if (order.assigned_at) {
      timeline.push({
        label: 'Assigned to Driver',
        date: new Date(order.assigned_at),
        completed: true,
      });
    }

    if (order.accepted_at) {
      timeline.push({
        label: 'Accepted by Driver',
        date: new Date(order.accepted_at),
        completed: true,
      });
    }

    if (order.picked_up_at) {
      timeline.push({
        label: 'Picked Up',
        date: new Date(order.picked_up_at),
        completed: true,
      });
    }

    if (order.delivered_at) {
      timeline.push({
        label: 'Delivered',
        date: new Date(order.delivered_at),
        completed: true,
      });
    } else if (order.cancelled_at) {
      timeline.push({
        label: 'Cancelled',
        date: new Date(order.cancelled_at),
        completed: true,
      });
    }

    return timeline;
  };

  const timeline = getOrderTimeline();

  const heroContent = (
    <Box style={{ textAlign: 'center', padding: '24px' }}>
      <Badge variant={getStatusBadgeVariant(order.status)} size="large">
        {formatStatus(order.status)}
      </Badge>
      <Typography variant="h2" style={{ marginTop: '16px' }}>
        Order #{order.id.slice(0, 8)}
      </Typography>
      {order.estimated_delivery_time && !order.delivered_at && (
        <Typography color="secondary" style={{ marginTop: '8px' }}>
          Estimated delivery: {new Date(order.estimated_delivery_time).toLocaleString()}
        </Typography>
      )}
    </Box>
  );

  const sections = [
    {
      title: 'Order Timeline',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {timeline.map((step, index) => (
            <Box
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
              }}
            >
              <Box
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: step.completed ? '#10b981' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.completed && (
                  <Typography style={{ color: 'white', fontSize: '14px' }}>✓</Typography>
                )}
              </Box>
              {index < timeline.length - 1 && (
                <Box
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '24px',
                    width: '2px',
                    height: 'calc(100% + 16px)',
                    backgroundColor: '#e5e7eb',
                  }}
                />
              )}
              <Box style={{ flex: 1 }}>
                <Typography weight="semibold">{step.label}</Typography>
                <Typography variant="caption" color="secondary">
                  {step.date.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ),
    },
    {
      title: 'Items',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.items.map((item, index) => (
            <Box
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
              }}
            >
              <Box>
                <Typography weight="semibold">{item.product_name}</Typography>
                <Typography variant="caption" color="secondary">
                  Quantity: {item.quantity}
                </Typography>
              </Box>
              <Typography weight="semibold">₪{(item.price * item.quantity).toFixed(2)}</Typography>
            </Box>
          ))}
          <Box
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h4">Total</Typography>
            <Typography variant="h4" style={{ color: '#3b82f6' }}>
              ₪{order.total_amount.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Delivery Information',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Box>
            <Typography variant="caption" color="secondary">
              Customer
            </Typography>
            <Typography weight="semibold">{order.customer_name}</Typography>
            <Typography>{order.customer_phone}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="secondary">
              Delivery Address
            </Typography>
            <Typography>{order.customer_address}</Typography>
          </Box>
          {order.assigned_driver && (
            <Box>
              <Typography variant="caption" color="secondary">
                Driver
              </Typography>
              <Typography weight="semibold">{order.assigned_driver}</Typography>
            </Box>
          )}
          {order.notes && (
            <Box>
              <Typography variant="caption" color="secondary">
                Notes
              </Typography>
              <Typography>{order.notes}</Typography>
            </Box>
          )}
        </Box>
      ),
    },
  ];

  if (order.delivery_proof_url) {
    sections.push({
      title: 'Delivery Proof',
      content: (
        <Box>
          <img
            src={order.delivery_proof_url}
            alt="Delivery proof"
            style={{
              width: '100%',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          />
        </Box>
      ),
    });
  }

  const sidebarContent = (
    <Box
      style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {order.assigned_driver_id && (
        <Button
          variant="primary"
          fullWidth
          onClick={() => onContactDriver?.(order.assigned_driver_id!)}
        >
          Contact Driver
        </Button>
      )}

      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <Button
          variant="secondary"
          fullWidth
          onClick={() => onCancelOrder?.(order.id)}
        >
          Cancel Order
        </Button>
      )}

      <Button variant="text" fullWidth>
        Download Receipt
      </Button>

      <Button variant="text" fullWidth>
        Report Issue
      </Button>
    </Box>
  );

  return (
    <DetailPageTemplate
      title={`Order #${order.id.slice(0, 8)}`}
      subtitle={`Placed on ${new Date(order.delivery_date || '').toLocaleDateString()}`}
      hero={heroContent}
      sections={sections}
      sidebar={sidebarContent}
      onBack={onBack}
      actions={
        <Button variant="text" size="small">
          Track on Map
        </Button>
      }
    />
  );
}
