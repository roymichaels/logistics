import React, { useState, useMemo } from 'react';
import { DashboardLayout, MetricsGrid, Section } from '@components/dashboard-v2';
import { useOrders, useOrderStats, useOrderFilters, useOrderMutations } from '../hooks';
import { OrderCard } from '../components/OrderCard';
import { Order, OrderStatus, OrderFilters } from '../types';
import { orderWorkflowService } from '../services';
import { logger } from '@lib/logger';

interface UnifiedOrdersPageProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

export function UnifiedOrdersPage({
  businessId,
  role,
  userId,
  onNavigate
}: UnifiedOrdersPageProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { orders, loading, error, refresh } = useOrders({
    businessId,
    autoLoad: true
  });

  const { filters, setFilters, filteredOrders } = useOrderFilters(orders);

  const stats = useOrderStats(filteredOrders);

  const { updateStatus, cancelOrder, assignDriver, updating, cancelling } = useOrderMutations();

  const displayedOrders = useMemo(() => {
    let result = filteredOrders;

    if (selectedStatus && selectedStatus !== 'all') {
      result = result.filter(o => o.status === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.orderNumber?.toLowerCase().includes(term) ||
        o.customer?.name?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
      );
    }

    return result;
  }, [filteredOrders, selectedStatus, searchTerm]);

  const metrics = useMemo(() => {
    return [
      {
        id: 'total',
        label: 'Total Orders',
        value: stats.total,
        icon: '📦',
        trend: stats.total > 0 ? { direction: 'neutral' as const, value: `${stats.total} orders` } : undefined
      },
      {
        id: 'pending',
        label: 'Pending',
        value: stats.pending + stats.confirmed,
        icon: '⏳',
        color: '#fbbf24'
      },
      {
        id: 'active',
        label: 'In Progress',
        value: stats.preparing + stats.assigned + stats.pickedUp + stats.inTransit,
        icon: '🚚',
        color: '#3b82f6'
      },
      {
        id: 'completed',
        label: 'Delivered',
        value: stats.delivered,
        icon: '✅',
        color: '#10b981'
      },
      {
        id: 'revenue',
        label: 'Total Revenue',
        value: `$${stats.totalRevenue.toLocaleString()}`,
        icon: '💰',
        color: '#8b5cf6'
      },
      {
        id: 'avg-order',
        label: 'Avg Order Value',
        value: `$${stats.averageOrderValue.toFixed(2)}`,
        icon: '📊',
        color: '#06b6d4'
      }
    ];
  }, [stats]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        id: 'create-order',
        label: 'Create Order',
        icon: '➕',
        onClick: () => onNavigate?.('/orders/new')
      },
      {
        id: 'refresh',
        label: 'Refresh',
        icon: '🔄',
        onClick: refresh,
        variant: 'secondary' as const
      }
    ];

    if (role === 'dispatcher' || role === 'manager') {
      actions.push({
        id: 'dispatch',
        label: 'Dispatch Board',
        icon: '🗺️',
        onClick: () => onNavigate?.('/dispatch'),
        variant: 'secondary' as const
      });
    }

    return actions;
  }, [role, refresh, onNavigate]);

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (!userId) {
      logger.error('User ID required for status change');
      return;
    }

    const validation = orderWorkflowService.validateTransition(order, newStatus);

    if (!validation.valid) {
      logger.error(`Cannot transition order ${order.id}: ${validation.errors.join(', ')}`);
      alert(`Cannot change status: ${validation.errors.join(', ')}`);
      return;
    }

    const success = await updateStatus({
      orderId: order.id,
      newStatus,
      performedBy: userId,
      notes: `Status changed from ${order.status} to ${newStatus}`
    });

    if (success) {
      await refresh();
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!userId) return;

    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    const success = await cancelOrder({
      orderId: order.id,
      reason,
      performedBy: userId
    });

    if (success) {
      await refresh();
    }
  };

  const handleAssignDriver = async (order: Order) => {
    alert('Driver assignment UI coming soon!');
  };

  const dashboardConfig = {
    title: 'Orders',
    subtitle: businessId ? `Business Orders` : 'All Orders',
    metrics,
    quickActions,
    refreshInterval: 30000,
    onRefresh: refresh
  };

  return (
    <DashboardLayout config={dashboardConfig} loading={loading} error={error ? new Error(error) : null}>
      <Section
        section={{
          id: 'filters',
          title: 'Filters',
          children: (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px'
                }}
              />

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | 'all')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          )
        }}
        collapsible={true}
      />

      <Section
        section={{
          id: 'orders-list',
          title: `Orders (${displayedOrders.length})`,
          subtitle: selectedStatus !== 'all' ? `Filtered by: ${orderWorkflowService.getStatusLabel(selectedStatus as OrderStatus)}` : undefined,
          children: (
            <div>
              {displayedOrders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    No orders found
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    {searchTerm || selectedStatus !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first order to get started'}
                  </p>
                </div>
              ) : (
                displayedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => onNavigate?.(`/orders/${order.id}`)}
                    onStatusChange={handleStatusChange}
                    onAssignDriver={handleAssignDriver}
                    onCancel={handleCancelOrder}
                    showActions={order.status !== 'delivered' && order.status !== 'cancelled'}
                  />
                ))
              )}
            </div>
          )
        }}
      />
    </DashboardLayout>
  );
}
