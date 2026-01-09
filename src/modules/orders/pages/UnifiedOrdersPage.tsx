import React, { useState, useMemo, Component, ErrorInfo } from 'react';
import { DashboardLayout, Section } from '@/components/templates/DashboardLayout';
import { useOrders } from '@/application/use-cases';
import { useOrderStats, useOrderFilters, useOrderMutations } from '../hooks';
import { OrderCard } from '../components/OrderCard';
import { Order, OrderStatus, OrderFilters } from '../types';
import { orderWorkflowService } from '../services';
import { logger } from '@lib/logger';
import { BusinessContextGuard } from '@/components/guards';
import { useSafeAppServices } from '@/context/AppServicesContext';

class OrdersPageErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[OrdersPage] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'red', marginBottom: '1rem' }}>
            Failed to load orders: {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface UnifiedOrdersPageProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

function UnifiedOrdersPageInner({
  businessId,
  role,
  userId,
  onNavigate
}: UnifiedOrdersPageProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { orders, loading, error, refetch: refresh } = useOrders(
    businessId ? { business_id: businessId } : undefined
  );

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
        label: 'סך כל ההזמנות',
        value: stats.total,
        icon: '📦',
        trend: stats.total > 0 ? { direction: 'neutral' as const, value: `${stats.total} הזמנות` } : undefined
      },
      {
        id: 'pending',
        label: 'ממתינות',
        value: stats.pending + stats.confirmed,
        icon: '⏳',
        color: '#fbbf24'
      },
      {
        id: 'active',
        label: 'בביצוע',
        value: stats.preparing + stats.assigned + stats.pickedUp + stats.inTransit,
        icon: '🚚',
        color: '#3b82f6'
      },
      {
        id: 'completed',
        label: 'נמסרו',
        value: stats.delivered,
        icon: '✅',
        color: '#10b981'
      },
      {
        id: 'revenue',
        label: 'הכנסות כוללות',
        value: `₪${stats.totalRevenue.toLocaleString()}`,
        icon: '💰',
        color: '#8b5cf6'
      },
      {
        id: 'avg-order',
        label: 'ממוצע הזמנה',
        value: `₪${stats.averageOrderValue.toFixed(2)}`,
        icon: '📊',
        color: '#06b6d4'
      }
    ];
  }, [stats]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        id: 'create-order',
        label: 'צור הזמנה',
        icon: '➕',
        onClick: () => onNavigate?.('/orders/new')
      },
      {
        id: 'refresh',
        label: 'רענן',
        icon: '🔄',
        onClick: refresh,
        variant: 'secondary' as const
      }
    ];

    if (role === 'dispatcher' || role === 'manager') {
      actions.push({
        id: 'dispatch',
        label: 'לוח שיבוץ',
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
    title: 'הזמנות',
    subtitle: businessId ? `הזמנות העסק` : 'כל ההזמנות',
    metrics,
    quickActions,
    refreshInterval: 30000,
    onRefresh: refresh
  };

  return (
    <BusinessContextGuard>
      <DashboardLayout config={dashboardConfig} loading={loading} error={error ? (error instanceof Error ? error : new Error(String(error))) : null}>
        <Section
          section={{
            id: 'filters',
            title: 'מסננים',
            children: (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="חיפוש הזמנות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '200px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    direction: 'rtl'
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
                    cursor: 'pointer',
                    direction: 'rtl'
                  }}
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="pending">ממתינה</option>
                  <option value="confirmed">מאושרת</option>
                  <option value="preparing">בהכנה</option>
                  <option value="ready_for_pickup">מוכנה לאיסוף</option>
                  <option value="assigned">שובצה</option>
                  <option value="picked_up">נאספה</option>
                  <option value="in_transit">בדרך</option>
                  <option value="delivered">נמסרה</option>
                  <option value="cancelled">בוטלה</option>
                  <option value="failed">נכשלה</option>
                </select>
              </div>
            )
          }}
          collapsible={true}
        />

        <Section
          section={{
            id: 'orders-list',
            title: `הזמנות (${displayedOrders.length})`,
            subtitle: selectedStatus !== 'all' ? `סינון לפי: ${orderWorkflowService.getStatusLabel(selectedStatus as OrderStatus)}` : undefined,
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
                      לא נמצאו הזמנות
                    </h3>
                    <p style={{ fontSize: '14px' }}>
                      {searchTerm || selectedStatus !== 'all'
                        ? 'נסה לשנות את המסננים'
                        : 'צור את ההזמנה הראשונה שלך כדי להתחיל'}
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
    </BusinessContextGuard>
  );
}

export function UnifiedOrdersPage(props?: UnifiedOrdersPageProps) {
  const appServices = useSafeAppServices();
  const businessIdFromContext = appServices?.currentBusinessId;

  const businessId = props?.businessId || businessIdFromContext || undefined;

  return (
    <OrdersPageErrorBoundary>
      <UnifiedOrdersPageInner {...props} businessId={businessId} />
    </OrdersPageErrorBoundary>
  );
}
