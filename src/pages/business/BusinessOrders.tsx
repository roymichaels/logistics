import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getStatusBadgeStyle, getStatusColor } from '../../utils/undergroundStyles';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundStatCard,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
} from '../../components/underground';
import { Toast } from '../../components/Toast';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'in_delivery' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  customer_name?: string;
  customer_phone?: string;
}

export function BusinessOrders() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadOrders();

    if (!currentBusinessId) return;

    const subscription = supabase
      .channel(`business-orders-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${currentBusinessId}`
        },
        () => {
          logger.info('[BusinessOrders] Real-time update received');
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId, dateFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessOrders] No business context');
        return;
      }

      let query = supabase
        .from('orders')
        .select('id, order_number, customer_id, status, total, created_at, updated_at, delivery_address')
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (dateFilter !== 'all') {
        const now = new Date();
        let dateThreshold = new Date();

        if (dateFilter === 'today') {
          dateThreshold.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          dateThreshold.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          dateThreshold.setDate(now.getDate() - 30);
        }

        query = query.gte('created_at', dateThreshold.toISOString());
      }

      const { data: ordersData, error } = await query;

      if (error) {
        logger.error('[BusinessOrders] Error loading orders:', error);
        Toast.error('Failed to load orders');
        return;
      }

      const customerIds = Array.from(new Set(ordersData?.map(o => o.customer_id).filter(Boolean)));

      let profilesMap = new Map<string, any>();

      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', customerIds);

        profiles?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const enrichedOrders = (ordersData || []).map(order => {
        const profile = order.customer_id ? profilesMap.get(order.customer_id) : null;
        return {
          ...order,
          customer_name: profile?.full_name || 'Anonymous Customer',
          customer_phone: profile?.phone || ''
        };
      });

      setOrders(enrichedOrders);
      logger.info('[BusinessOrders] Orders loaded:', enrichedOrders.length);
    } catch (error) {
      logger.error('[BusinessOrders] Failed to load orders:', error);
      Toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready_for_pickup: 'Ready for Pickup',
      in_delivery: 'In Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const exportOrders = () => {
    const csvData = [
      ['Order Number', 'Customer', 'Phone', 'Status', 'Amount', 'Date'],
      ...filteredOrders.map(o => [
        o.order_number || `#${o.id.slice(0, 8)}`,
        o.customer_name || '',
        o.customer_phone || '',
        getStatusLabel(o.status),
        o.total,
        formatDate(o.created_at)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    logger.info('[BusinessOrders] Orders exported');
    Toast.success('Orders exported successfully');
  };

  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = searchQuery === '' ||
        o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone?.includes(searchQuery) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => ['confirmed', 'preparing', 'ready_for_pickup', 'in_delivery'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
  };

  const tableColumns = [
    {
      key: 'order_number',
      label: 'Order Number',
      render: (value: string, row: Order) => (
        <div style={{ fontWeight: undergroundTheme.typography.fontWeight.semibold }}>
          {value || `#${row.id.slice(0, 8)}`}
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
    },
    {
      key: 'customer_phone',
      label: 'Phone',
      render: (value: string) => value || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: OrderStatus) => (
        <span style={{
          ...getStatusBadgeStyle(value),
          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
          borderRadius: undergroundTheme.borderRadius.full,
          fontSize: undergroundTheme.typography.fontSize.sm,
          fontWeight: undergroundTheme.typography.fontWeight.semibold,
        }}>
          {getStatusLabel(value)}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Amount',
      render: (value: number) => (
        <span style={{ fontWeight: undergroundTheme.typography.fontWeight.semibold }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Order) => (
        <UndergroundButton
          variant="primary"
          onClick={() => navigate(`/business/orders/${row.id}`)}
          style={{
            padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
            fontSize: undergroundTheme.typography.fontSize.sm,
          }}
        >
          View
        </UndergroundButton>
      ),
    },
  ];

  if (!currentBusinessId) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundEmptyState
          title="No Business Context"
          message="Please select a business to view orders"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundLoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{
      background: undergroundTheme.colors.gradient.primary,
      color: undergroundTheme.colors.text.primary,
      minHeight: '100vh',
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl'],
    }}>
      <UndergroundHeader
        title="Order Management"
        subtitle="Track and manage your orders"
        action={
          <UndergroundButton
            variant="primary"
            onClick={exportOrders}
          >
            Export CSV
          </UndergroundButton>
        }
      />

      <UndergroundSection>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: undergroundTheme.spacing.lg,
        }}>
          <UndergroundStatCard
            icon={<span style={{ fontSize: '28px' }}>📦</span>}
            label="Total Orders"
            value={stats.total}
            accentColor={undergroundTheme.colors.accent.primary}
            onClick={() => setStatusFilter('all')}
          />
          <UndergroundStatCard
            icon={<span style={{ fontSize: '28px' }}>⏳</span>}
            label="Pending"
            value={stats.pending}
            accentColor={undergroundTheme.colors.status.warning}
            onClick={() => setStatusFilter('pending')}
          />
          <UndergroundStatCard
            icon={<span style={{ fontSize: '28px' }}>🔄</span>}
            label="In Progress"
            value={stats.inProgress}
            accentColor={undergroundTheme.colors.status.info}
          />
          <UndergroundStatCard
            icon={<span style={{ fontSize: '28px' }}>✅</span>}
            label="Completed"
            value={stats.completed}
            accentColor={undergroundTheme.colors.status.success}
            onClick={() => setStatusFilter('delivered')}
          />
          <UndergroundStatCard
            icon={<span style={{ fontSize: '28px' }}>💰</span>}
            label="Revenue"
            value={formatCurrency(stats.revenue)}
            accentColor={undergroundTheme.colors.accent.primary}
          />
        </div>
      </UndergroundSection>

      <UndergroundSection>
        <UndergroundCard>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: undergroundTheme.spacing.md,
            marginBottom: undergroundTheme.spacing.xl,
          }}>
            <UndergroundInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, customer or phone..."
              fullWidth
            />

            <UndergroundSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'preparing', label: 'Preparing' },
                { value: 'ready_for_pickup', label: 'Ready for Pickup' },
                { value: 'in_delivery', label: 'In Delivery' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />

            <UndergroundSelect
              value={dateFilter}
              onChange={(value) => setDateFilter(value as any)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Last Week' },
                { value: 'month', label: 'Last Month' },
              ]}
            />

            <UndergroundButton
              variant="ghost"
              onClick={loadOrders}
            >
              🔄
            </UndergroundButton>
          </div>

          {filteredOrders.length === 0 ? (
            <UndergroundEmptyState
              title="No Orders Found"
              message={searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No orders match your filters'
                : 'No orders have been placed yet'}
            />
          ) : (
            <>
              <UndergroundTable
                columns={tableColumns}
                data={filteredOrders}
                loading={false}
                emptyMessage="No orders found"
                hover
              />

              <div style={{
                marginTop: undergroundTheme.spacing.xl,
                padding: undergroundTheme.spacing.lg,
                ...undergroundTheme.effects.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.lg,
                color: undergroundTheme.colors.text.secondary,
                fontSize: undergroundTheme.typography.fontSize.sm,
              }}>
                <strong style={{ color: undergroundTheme.colors.text.primary }}>Total:</strong> {filteredOrders.length} orders
                {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && ` (filtered from ${orders.length})`}
              </div>
            </>
          )}
        </UndergroundCard>
      </UndergroundSection>
    </div>
  );
}
