import React, { useEffect, useState } from 'react';
import { FeedTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';

interface OrderMarketplacePageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

interface MarketplaceOrder {
  id: string;
  customer_name: string;
  pickup_address: string;
  delivery_address: string;
  distance: number;
  estimated_time: number;
  order_total: number;
  delivery_fee: number;
  items_count: number;
  special_requirements?: string;
  posted_time: string;
  urgency: 'normal' | 'urgent' | 'scheduled';
}

export function OrderMarketplacePage({ dataStore, onNavigate }: OrderMarketplacePageProps) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'nearby' | 'high_pay' | 'urgent'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketplace();
  }, [dataStore, filter]);

  const loadMarketplace = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const orderList = (await dataStore?.listOrders?.()) ?? [];

      const availableOrders = orderList
        .filter((o: any) => o.status === 'new' || o.status === 'confirmed')
        .map((order: any, index: number) => ({
          id: order.id,
          customer_name: order.customer_name,
          pickup_address: order.business_name || 'Business Location',
          delivery_address: order.delivery_address || `${order.customer_name}'s Address`,
          distance: 2 + Math.random() * 8,
          estimated_time: 15 + Math.floor(Math.random() * 30),
          order_total: order.total_amount,
          delivery_fee: order.total_amount * 0.15 + (Math.random() * 10 - 5),
          items_count: order.items?.length || Math.floor(Math.random() * 5) + 1,
          special_requirements: order.notes,
          posted_time: `${Math.floor(Math.random() * 30) + 1}m ago`,
          urgency: (index % 5 === 0 ? 'urgent' : index % 3 === 0 ? 'scheduled' : 'normal') as const,
        }));

      if (mounted) {
        let filtered = availableOrders;

        if (filter === 'nearby') {
          filtered = availableOrders.filter((o) => o.distance < 5);
        } else if (filter === 'high_pay') {
          filtered = availableOrders.filter((o) => o.delivery_fee > 20);
        } else if (filter === 'urgent') {
          filtered = availableOrders.filter((o) => o.urgency === 'urgent');
        }

        setOrders(filtered);
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await dataStore?.assignDriver?.(orderId, 'current-driver');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      onNavigate?.('/driver/routes');
    } catch (error) {
      console.error('Failed to accept order:', error);
    }
  };

  const renderOrderCard = (order: MarketplaceOrder) => (
    <Box
      style={{
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
      }}
    >
      <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography variant="body" weight="bold">
            #{order.id.slice(0, 8)}
          </Typography>
          {order.urgency === 'urgent' && <Badge variant="error">Urgent</Badge>}
          {order.urgency === 'scheduled' && <Badge variant="info">Scheduled</Badge>}
        </Box>
        <Typography variant="body" weight="bold" style={{ color: '#10b981', fontSize: '18px' }}>
          ₪{order.delivery_fee.toFixed(2)}
        </Typography>
      </Box>

      <Box style={{ marginBottom: '12px' }}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>📍</span>
          <Box>
            <Typography variant="caption" color="secondary">
              Pickup
            </Typography>
            <Typography variant="small">{order.pickup_address}</Typography>
          </Box>
        </Box>
        <Box style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🎯</span>
          <Box>
            <Typography variant="caption" color="secondary">
              Deliver to
            </Typography>
            <Typography variant="small">{order.delivery_address}</Typography>
          </Box>
        </Box>
      </Box>

      <Box
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '12px',
        }}
      >
        <Box>
          <Typography variant="caption" color="secondary">
            Distance
          </Typography>
          <Typography variant="small" weight="semibold">
            {order.distance.toFixed(1)} km
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="secondary">
            Est. Time
          </Typography>
          <Typography variant="small" weight="semibold">
            {order.estimated_time} min
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="secondary">
            Items
          </Typography>
          <Typography variant="small" weight="semibold">
            {order.items_count}
          </Typography>
        </Box>
        <Box style={{ marginLeft: 'auto' }}>
          <Typography variant="caption" color="secondary">
            Posted
          </Typography>
          <Typography variant="small" weight="semibold">
            {order.posted_time}
          </Typography>
        </Box>
      </Box>

      {order.special_requirements && (
        <Box
          style={{
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        >
          <Typography variant="caption" style={{ color: '#92400e' }}>
            ⚠️ {order.special_requirements}
          </Typography>
        </Box>
      )}

      <Box style={{ display: 'flex', gap: '8px' }}>
        <Button
          variant="primary"
          fullWidth
          onClick={() => handleAcceptOrder(order.id)}
        >
          Accept Order
        </Button>
        <Button variant="secondary" onClick={() => console.log('View details:', order.id)}>
          Details
        </Button>
      </Box>
    </Box>
  );

  const feedItems = orders.map((order) => ({
    id: order.id,
    content: renderOrderCard(order),
    timestamp: order.posted_time,
  }));

  const filters = [
    { label: 'All Orders', value: 'all', active: filter === 'all' },
    { label: 'Nearby', value: 'nearby', active: filter === 'nearby' },
    { label: 'High Pay', value: 'high_pay', active: filter === 'high_pay' },
    { label: 'Urgent', value: 'urgent', active: filter === 'urgent' },
  ];

  const stats = [
    {
      label: 'Available Orders',
      value: orders.length.toString(),
      icon: '📦',
    },
    {
      label: 'Nearby (<5km)',
      value: orders.filter((o) => o.distance < 5).length.toString(),
      icon: '📍',
    },
    {
      label: 'Avg. Earnings',
      value:
        orders.length > 0
          ? `₪${(orders.reduce((sum, o) => sum + o.delivery_fee, 0) / orders.length).toFixed(2)}`
          : '₪0',
      icon: '💰',
    },
  ];

  const emptyState = {
    title: 'No orders available',
    description: 'Check back soon for new delivery opportunities',
    icon: '📦',
    action: {
      label: 'Refresh',
      onClick: loadMarketplace,
    },
  };

  return (
    <FeedTemplate
      title="Order Marketplace"
      subtitle="Accept orders and start earning"
      items={feedItems}
      filters={filters}
      onFilterChange={(value) => setFilter(value as any)}
      stats={stats}
      emptyState={emptyState}
      loading={loading}
      actions={
        <Box style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="small" onClick={loadMarketplace}>
            Refresh
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => onNavigate?.('/driver/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      }
    />
  );
}
