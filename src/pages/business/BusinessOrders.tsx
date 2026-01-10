import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { useService } from '../../hooks/useService';
import { OrderService } from '../../services/modules/OrderService';
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
  UndergroundModal,
  UndergroundBadge,
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
  items?: OrderItem[];
  assigned_driver?: string | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: { name: string; sku: string };
}

interface OrderDetailModalState {
  show: boolean;
  order: Order | null;
  loading: boolean;
}

export function BusinessOrders() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();
  const orderService = useService(OrderService);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [orderDetailModal, setOrderDetailModal] = useState<OrderDetailModalState>({
    show: false,
    order: null,
    loading: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Prepare filters for OrderService
      const filters: any = {
        sortBy: 'created_at',
        sortOrder: 'desc' as const
      };

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

        filters.dateFrom = dateThreshold.toISOString();
      }

      // Load orders using OrderService
      const ordersData = await orderService.listOrders(filters);

      // Enrich with customer profiles
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
          customer_phone: profile?.phone || '',
          total: order.total_amount || 0
        };
      });

      setOrders(enrichedOrders as any);
      logger.info('[BusinessOrders] Orders loaded:', enrichedOrders.length);
    } catch (error) {
      logger.error('[BusinessOrders] Failed to load orders:', error);
      Toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (order: Order) => {
    setOrderDetailModal({ show: true, order: null, loading: true });

    try {
      // Load full order details with items using OrderService
      const fullOrder = await orderService.getOrder(order.id);

      // Load order items
      const { data: items } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          price,
          product:products(name, sku)
        `)
        .eq('order_id', order.id);

      setOrderDetailModal({
        show: true,
        order: {
          ...fullOrder,
          items: items || [],
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total: fullOrder.total_amount || 0
        } as any,
        loading: false
      });
    } catch (error) {
      logger.error('[BusinessOrders] Failed to load order details:', error);
      Toast.error('Failed to load order details');
      setOrderDetailModal({ show: false, order: null, loading: false });
    }
  };

  const closeOrderDetail = () => {
    setOrderDetailModal({ show: false, order: null, loading: false });
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!orderDetailModal.order) return;

    try {
      setIsSubmitting(true);

      await orderService.updateStatus(orderDetailModal.order.id, newStatus);

      Toast.success('Order status updated successfully');
      closeOrderDetail();
      loadOrders();
    } catch (error) {
      logger.error('[BusinessOrders] Failed to update order status:', error);
      Toast.error('Failed to update order status');
    } finally {
      setIsSubmitting(false);
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
          onClick={() => openOrderDetail(row)}
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

      {/* Order Detail Modal */}
      {orderDetailModal.show && (
        <UndergroundModal
          isOpen={orderDetailModal.show}
          onClose={closeOrderDetail}
          title={`Order #${orderDetailModal.order?.order_number || orderDetailModal.order?.id.slice(0, 8) || 'Loading...'}`}
          size="large"
        >
          {orderDetailModal.loading || !orderDetailModal.order ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: undergroundTheme.spacing['3xl'] }}>
              <UndergroundLoadingSpinner size="lg" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.xl }}>
              {/* Order Status and Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: undergroundTheme.spacing.lg,
                ...undergroundTheme.effects.glassmorphism.light,
                borderRadius: undergroundTheme.borderRadius.lg
              }}>
                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    Current Status
                  </div>
                  <UndergroundBadge variant={
                    orderDetailModal.order.status === 'delivered' ? 'success' :
                    orderDetailModal.order.status === 'cancelled' ? 'error' :
                    orderDetailModal.order.status === 'pending' ? 'warning' :
                    'info'
                  }>
                    {getStatusLabel(orderDetailModal.order.status)}
                  </UndergroundBadge>
                </div>
                <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                  {orderDetailModal.order.status === 'pending' && (
                    <UndergroundButton
                      onClick={() => handleStatusChange('confirmed')}
                      variant="success"
                      disabled={isSubmitting}
                    >
                      Confirm Order
                    </UndergroundButton>
                  )}
                  {orderDetailModal.order.status === 'confirmed' && (
                    <UndergroundButton
                      onClick={() => handleStatusChange('preparing')}
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      Start Preparing
                    </UndergroundButton>
                  )}
                  {orderDetailModal.order.status === 'preparing' && (
                    <UndergroundButton
                      onClick={() => handleStatusChange('ready_for_pickup')}
                      variant="primary"
                      disabled={isSubmitting}
                    >
                      Mark Ready
                    </UndergroundButton>
                  )}
                  {['pending', 'confirmed', 'preparing'].includes(orderDetailModal.order.status) && (
                    <UndergroundButton
                      onClick={() => handleStatusChange('cancelled')}
                      variant="error"
                      disabled={isSubmitting}
                    >
                      Cancel Order
                    </UndergroundButton>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h4 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.md,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Customer Information
                </h4>
                <div style={{
                  padding: undergroundTheme.spacing.lg,
                  ...undergroundTheme.effects.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: undergroundTheme.spacing.lg
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      Name
                    </div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {orderDetailModal.order.customer_name || 'Anonymous'}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      Phone
                    </div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {orderDetailModal.order.customer_phone || 'N/A'}
                    </div>
                  </div>
                  {orderDetailModal.order.delivery_address && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.secondary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        Delivery Address
                      </div>
                      <div style={{
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {orderDetailModal.order.delivery_address}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.md,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Order Items
                </h4>
                <div style={{
                  ...undergroundTheme.effects.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  overflow: 'hidden'
                }}>
                  {orderDetailModal.order.items && orderDetailModal.order.items.length > 0 ? (
                    <>
                      {orderDetailModal.order.items.map((item, index) => (
                        <div
                          key={item.id}
                          style={{
                            padding: undergroundTheme.spacing.lg,
                            borderBottom: index < orderDetailModal.order!.items!.length - 1
                              ? `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                              : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: undergroundTheme.typography.fontWeight.semibold,
                              color: undergroundTheme.colors.text.primary,
                              marginBottom: undergroundTheme.spacing.xs
                            }}>
                              {item.product?.name || 'Unknown Product'}
                            </div>
                            <div style={{
                              fontSize: undergroundTheme.typography.fontSize.sm,
                              color: undergroundTheme.colors.text.secondary
                            }}>
                              SKU: {item.product?.sku || 'N/A'}
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: undergroundTheme.spacing.xl,
                            alignItems: 'center'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                fontSize: undergroundTheme.typography.fontSize.sm,
                                color: undergroundTheme.colors.text.secondary,
                                marginBottom: undergroundTheme.spacing.xs
                              }}>
                                Quantity
                              </div>
                              <div style={{
                                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                                color: undergroundTheme.colors.text.primary
                              }}>
                                {item.quantity}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                fontSize: undergroundTheme.typography.fontSize.sm,
                                color: undergroundTheme.colors.text.secondary,
                                marginBottom: undergroundTheme.spacing.xs
                              }}>
                                Price
                              </div>
                              <div style={{
                                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                                color: undergroundTheme.colors.text.primary
                              }}>
                                {formatCurrency(item.price)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                              <div style={{
                                fontSize: undergroundTheme.typography.fontSize.sm,
                                color: undergroundTheme.colors.text.secondary,
                                marginBottom: undergroundTheme.spacing.xs
                              }}>
                                Subtotal
                              </div>
                              <div style={{
                                fontWeight: undergroundTheme.typography.fontWeight.bold,
                                color: undergroundTheme.colors.accent.primary,
                                fontSize: undergroundTheme.typography.fontSize.lg
                              }}>
                                {formatCurrency(item.quantity * item.price)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Order Total */}
                      <div style={{
                        padding: undergroundTheme.spacing.lg,
                        background: undergroundTheme.colors.glassmorphism.medium,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.lg,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.text.primary
                        }}>
                          Order Total
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize['2xl'],
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.accent.primary
                        }}>
                          {formatCurrency(orderDetailModal.order.total)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: undergroundTheme.spacing.xl, textAlign: 'center', color: undergroundTheme.colors.text.secondary }}>
                      No items found
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div>
                <h4 style={{
                  margin: 0,
                  marginBottom: undergroundTheme.spacing.md,
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Order Timeline
                </h4>
                <div style={{
                  padding: undergroundTheme.spacing.lg,
                  ...undergroundTheme.effects.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: undergroundTheme.spacing.md
                }}>
                  <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                    <div style={{ color: undergroundTheme.colors.text.secondary }}>📅</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary,
                        marginBottom: undergroundTheme.spacing.xs
                      }}>
                        Order Created
                      </div>
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.secondary
                      }}>
                        {formatDate(orderDetailModal.order.created_at)}
                      </div>
                    </div>
                  </div>
                  {orderDetailModal.order.updated_at !== orderDetailModal.order.created_at && (
                    <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                      <div style={{ color: undergroundTheme.colors.text.secondary }}>🔄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: undergroundTheme.colors.text.primary,
                          marginBottom: undergroundTheme.spacing.xs
                        }}>
                          Last Updated
                        </div>
                        <div style={{
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.text.secondary
                        }}>
                          {formatDate(orderDetailModal.order.updated_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </UndergroundModal>
      )}
    </div>
  );
}
