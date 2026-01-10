import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
} from '../../components/underground';

interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  delivery_address: any;
  businesses?: { name: string };
  profiles?: { name: string; email: string };
}

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled',
  'failed'
];

const getStatusVariant = (status: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'failed') return 'error';
  if (status === 'pending' || status === 'confirmed') return 'warning';
  return 'primary';
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          businesses (name),
          profiles (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('[AdminOrders] Failed to load orders', error);
        return;
      }

      setOrders(data || []);
      logger.info('[AdminOrders] Loaded orders', { count: data?.length });
    } catch (error) {
      logger.error('[AdminOrders] Exception loading orders', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        logger.error('[AdminOrders] Failed to update status', error);
        return;
      }

      loadOrders();
      logger.info('[AdminOrders] Order status updated', { orderId, newStatus });
    } catch (error) {
      logger.error('[AdminOrders] Exception updating status', error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundSection
          title="Platform Orders"
          icon="📦"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredOrders.length} of {orders.length} orders
              </div>

              <UndergroundButton
                variant="secondary"
                size="small"
                onClick={loadOrders}
              >
                Refresh
              </UndergroundButton>
            </div>
          </UndergroundCard>

          <UndergroundCard>
            <UndergroundTable
              headers={['Order', 'Business', 'Customer', 'Status', 'Total', 'Created', 'Actions']}
              rows={filteredOrders.map((order) => [
                <div key="order">
                  <div style={{
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.text.primary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    {order.order_number}
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    fontFamily: 'monospace'
                  }}>
                    {order.id.slice(0, 8)}...
                  </div>
                </div>,

                <div key="business" style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  {order.businesses?.name || 'N/A'}
                </div>,

                <div key="customer">
                  {order.profiles?.name && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {order.profiles.name}
                    </div>
                  )}
                  {order.profiles?.email && (
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {order.profiles.email}
                    </div>
                  )}
                  {!order.profiles?.name && !order.profiles?.email && (
                    <span style={{ color: undergroundTheme.colors.text.tertiary }}>-</span>
                  )}
                </div>,

                <UndergroundBadge key="status" variant={getStatusVariant(order.status)}>
                  {order.status.replace('_', ' ')}
                </UndergroundBadge>,

                <div key="total" style={{
                  fontSize: undergroundTheme.typography.fontSize.md,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.accent.primary
                }}>
                  {order.currency} {order.total.toFixed(2)}
                </div>,

                <div key="created" style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  {new Date(order.created_at).toLocaleDateString()}
                </div>,

                <div key="actions" style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                  <UndergroundButton
                    variant="ghost"
                    size="small"
                    onClick={() => {
                      const nextStatus = order.status === 'pending' ? 'confirmed' :
                                       order.status === 'confirmed' ? 'delivered' :
                                       order.status;
                      if (nextStatus !== order.status) {
                        handleUpdateStatus(order.id, nextStatus);
                      }
                    }}
                  >
                    Update
                  </UndergroundButton>
                </div>
              ])}
            />
          </UndergroundCard>
        </UndergroundSection>
      </div>
    </div>
  );
}
