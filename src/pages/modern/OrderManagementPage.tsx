import React, { useEffect, useState } from 'react';
import { KanbanTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import type { Order } from '@/data/types';

interface OrderManagementPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
  onOrderClick?: (order: Order) => void;
}

export function OrderManagementPage({
  dataStore,
  onNavigate,
  onOrderClick,
}: OrderManagementPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [dataStore]);

  const loadOrders = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const list = (await dataStore?.listOrders?.()) ?? [];
      if (mounted) {
        setOrders(list);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await dataStore?.updateOrderStatus?.(orderId, newStatus);
      await loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await dataStore?.assignDriver?.(orderId, driverId);
      await loadOrders();
    } catch (error) {
      console.error('Failed to assign driver:', error);
    }
  };

  const renderOrderCard = (order: Order) => (
    <Box
      style={{
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => onOrderClick?.(order)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <Box>
          <Typography variant="body" weight="bold" style={{ marginBottom: '4px' }}>
            #{order.id.slice(0, 8)}
          </Typography>
          <Typography variant="caption" color="secondary">
            {order.customer_name}
          </Typography>
        </Box>
        <Typography variant="body" weight="bold" style={{ color: '#3b82f6' }}>
          ₪{order.total_amount.toFixed(2)}
        </Typography>
      </Box>

      <Box style={{ marginBottom: '12px' }}>
        <Typography variant="small" color="secondary">
          {order.items.length} item{order.items.length > 1 ? 's' : ''}
        </Typography>
      </Box>

      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        {order.assigned_driver ? (
          <Badge variant="success" size="small">
            Driver: {order.assigned_driver}
          </Badge>
        ) : (
          <Badge variant="warning" size="small">
            No Driver
          </Badge>
        )}
        {order.delivery_date && (
          <Typography variant="caption" color="secondary">
            {new Date(order.delivery_date).toLocaleDateString()}
          </Typography>
        )}
      </Box>
    </Box>
  );

  const columns = [
    {
      id: 'new',
      title: 'New Orders',
      color: '#3b82f6',
      items: orders
        .filter((o) => o.status === 'new')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
    {
      id: 'confirmed',
      title: 'Confirmed',
      color: '#0ea5e9',
      items: orders
        .filter((o) => o.status === 'confirmed')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
    {
      id: 'preparing',
      title: 'Preparing',
      color: '#f59e0b',
      items: orders
        .filter((o) => o.status === 'preparing')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
    {
      id: 'ready',
      title: 'Ready',
      color: '#10b981',
      items: orders
        .filter((o) => o.status === 'ready')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
    {
      id: 'out_for_delivery',
      title: 'Out for Delivery',
      color: '#06b6d4',
      items: orders
        .filter((o) => o.status === 'out_for_delivery')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
    {
      id: 'delivered',
      title: 'Delivered',
      color: '#22c55e',
      items: orders
        .filter((o) => o.status === 'delivered')
        .map((order) => ({
          id: order.id,
          content: renderOrderCard(order),
        })),
    },
  ];

  const stats = [
    {
      label: 'Total Orders',
      value: orders.length.toString(),
      icon: '📦',
    },
    {
      label: 'New',
      value: orders.filter((o) => o.status === 'new').length.toString(),
      icon: '🆕',
    },
    {
      label: 'In Progress',
      value: orders.filter((o) =>
        ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
      ).length.toString(),
      icon: '⏳',
    },
    {
      label: 'Delivered',
      value: orders.filter((o) => o.status === 'delivered').length.toString(),
      icon: '✅',
    },
  ];

  const handleDragEnd = (itemId: string, sourceColumnId: string, targetColumnId: string) => {
    if (sourceColumnId !== targetColumnId) {
      handleStatusChange(itemId, targetColumnId);
    }
  };

  return (
    <KanbanTemplate
      title="Order Management"
      subtitle="Drag orders between columns to update status"
      columns={columns}
      stats={stats}
      onItemDragEnd={handleDragEnd}
      loading={loading}
      actions={
        <Box style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="small" onClick={loadOrders}>
            Refresh
          </Button>
          <Button variant="primary" size="small" onClick={() => onNavigate?.('/business/orders/new')}>
            + New Order
          </Button>
        </Box>
      }
    />
  );
}
